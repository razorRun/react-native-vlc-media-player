package com.yuanzhou.vlc.vlcplayer

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.SurfaceTexture
import android.media.AudioManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.TextureView
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.uimanager.ThemedReactContext
import org.videolan.libvlc.Dialog
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.interfaces.IMedia
import org.videolan.libvlc.interfaces.IVLCVout
import java.io.File
import java.io.FileOutputStream
import kotlin.math.roundToInt

/**
 * The VLC player view. Holds all playback logic; the view manager only forwards
 * props and commands to it.
 */
@SuppressLint("ViewConstructor")
class VlcPlayerView(private val reactContext: ThemedReactContext) :
    TextureView(reactContext),
    LifecycleEventListener,
    TextureView.SurfaceTextureListener,
    AudioManager.OnAudioFocusChangeListener {

    private val eventEmitter = VideoEventEmitter(this)
    private val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val progressUpdateHandler = Handler(Looper.getMainLooper())

    private var libvlc: LibVLC? = null
    private var mediaPlayer: MediaPlayer? = null
    private var sourceMap: ReadableMap? = null
    private var subtitleUri: String? = null

    private var muted = false
    private var surfaceDestroyed = false
    private var paused = true
    private var hostPaused = false
    private var released = false
    private var previousVolume = 100
    private var autoAspectRatio = false
    private var acceptInvalidCertificates = false

    private var videoWidth = 0
    private var videoHeight = 0
    private var videoVisibleWidth = 0
    private var videoVisibleHeight = 0
    private var sarNum = 0
    private var sarDen = 0

    private var progressUpdateInterval = 0f
    private var progressUpdateRunnable: Runnable? = null
    private var videoInfoHash: String? = null

    // -- Listeners ------------------------------------------------------------

    private val layoutChangeListener =
        View.OnLayoutChangeListener { view, _, _, _, _, _, _, _, _ ->
            if (view.width > 0 && view.height > 0) {
                videoWidth = view.width
                videoHeight = view.height
                val player = mediaPlayer
                if (player != null && !released) {
                    player.getVLCVout().setWindowSize(videoWidth, videoHeight)
                    if (autoAspectRatio) {
                        player.setAspectRatio(null)
                        player.setScale(0f)
                    }
                }
            }
        }

    private val playerListener = MediaPlayer.EventListener { event ->
        // VLC can still deliver an event after the player was released; the Java
        // version dereferenced the field unchecked here.
        val player = mediaPlayer ?: return@EventListener
        val map = Arguments.createMap()
        map.putBoolean("isPlaying", player.isPlaying)
        map.putDouble("position", player.position.toDouble())
        map.putDouble("currentTime", player.time.toDouble())
        map.putDouble("duration", player.length.toDouble())

        when (event.type) {
            MediaPlayer.Event.EndReached -> {
                map.putString("type", "Ended")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_END)
            }
            MediaPlayer.Event.Playing -> {
                map.putString("type", "Playing")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_IS_PLAYING)
            }
            MediaPlayer.Event.Opening -> {
                map.putString("type", "Opening")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_OPEN)
            }
            MediaPlayer.Event.Paused -> {
                map.putString("type", "Paused")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_PAUSED)
            }
            MediaPlayer.Event.Buffering -> {
                map.putDouble("bufferRate", event.buffering.toDouble())
                map.putString("type", "Buffering")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_VIDEO_BUFFERING)
            }
            MediaPlayer.Event.Stopped -> {
                map.putString("type", "Stopped")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_VIDEO_STOPPED)
            }
            MediaPlayer.Event.EncounteredError -> {
                map.putString("type", "Error")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_ERROR)
            }
            MediaPlayer.Event.TimeChanged -> {
                map.putString("type", "TimeChanged")
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_SEEK)
            }
            MediaPlayer.Event.RecordChanged -> {
                map.putString("type", "RecordingPath")
                map.putBoolean("isRecording", event.recording)
                // Starting a recording reports the path before the file exists.
                // Only report it once recording has stopped and the file is there.
                val recordPath = event.recordPath
                if (!event.recording && recordPath != null) {
                    map.putString("recordPath", recordPath)
                }
                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_RECORDING_STATE)
            }
            else -> {
                map.putString("type", event.type.toString())
                eventEmitter.onVideoStateChange(map)
            }
        }
    }

    private val newVideoLayoutListener =
        IVLCVout.OnNewVideoLayoutListener { _, width, height, visibleWidth, visibleHeight, sarNum, sarDen ->
            if (width * height == 0) {
                return@OnNewVideoLayoutListener
            }
            videoWidth = width
            videoHeight = height
            videoVisibleWidth = visibleWidth
            videoVisibleHeight = visibleHeight
            this.sarNum = sarNum
            this.sarDen = sarDen
            val map = Arguments.createMap()
            map.putInt("mVideoWidth", videoWidth)
            map.putInt("mVideoHeight", videoHeight)
            map.putInt("mVideoVisibleWidth", videoVisibleWidth)
            map.putInt("mVideoVisibleHeight", videoVisibleHeight)
            map.putInt("mSarNum", this.sarNum)
            map.putInt("mSarDen", this.sarDen)
            map.putString("type", "onNewVideoLayout")
            eventEmitter.onVideoStateChange(map)
        }

    private val voutCallback = object : IVLCVout.Callback {
        override fun onSurfacesCreated(vout: IVLCVout) {
            surfaceDestroyed = false
        }

        override fun onSurfacesDestroyed(vout: IVLCVout) {
            surfaceDestroyed = true
        }
    }

    private val mediaListener = IMedia.EventListener { event ->
        when (event.type) {
            IMedia.Event.MetaChanged -> Log.i(TAG, "Media.Event.MetaChanged: =${event.metaId}")
            IMedia.Event.ParsedChanged -> Log.i(TAG, "Media.Event.ParsedChanged =${event.metaId}")
            IMedia.Event.StateChanged -> Log.i(TAG, "StateChanged =${event.metaId}")
            else -> Log.i(TAG, "Media.Event.type=${event.type} eventgetParsedStatus=${event.parsedStatus}")
        }
    }

    private val dialogCallbacks = object : Dialog.Callbacks {
        override fun onDisplay(dialog: Dialog.QuestionDialog) {
            handleCertificateDialog(dialog)
        }

        override fun onDisplay(dialog: Dialog.ErrorMessage) {}

        override fun onDisplay(dialog: Dialog.LoginDialog) {}

        override fun onDisplay(dialog: Dialog.ProgressDialog) {}

        override fun onCanceled(dialog: Dialog?) {}

        override fun onProgressUpdate(dialog: Dialog.ProgressDialog) {}
    }

    init {
        surfaceTextureListener = this
        addOnLayoutChangeListener(layoutChangeListener)
        reactContext.addLifecycleEventListener(this)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopPlayback()
    }

    // -- LifecycleEventListener -----------------------------------------------

    override fun onHostResume() {
        val player = mediaPlayer ?: return
        if (surfaceDestroyed && hostPaused) {
            val vlcOut = player.getVLCVout()
            if (!vlcOut.areViewsAttached()) {
                vlcOut.attachViews(newVideoLayoutListener)
                surfaceDestroyed = false
                paused = false
                player.play()
            }
        }
    }

    override fun onHostPause() {
        val player = mediaPlayer
        if (!paused && player != null && !released) {
            paused = true
            hostPaused = true
            player.pause()
            val map = Arguments.createMap()
            map.putString("type", "Paused")
            eventEmitter.onVideoStateChange(map)
        }
        Log.i("onHostPause", "---------onHostPause------------>")
    }

    override fun onHostDestroy() {
        stopPlayback()
    }

    // -- AudioManager.OnAudioFocusChangeListener ------------------------------

    override fun onAudioFocusChange(focusChange: Int) {}

    // -- TextureView.SurfaceTextureListener -----------------------------------

    override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
        videoWidth = width
        videoHeight = height
        createPlayer(autoplayResume = true, isResume = false)
    }

    override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}

    override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean = true

    override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}

    // -- Player lifecycle -----------------------------------------------------

    private fun stopPlayback() {
        keepScreenOn = false
        @Suppress("DEPRECATION")
        audioManager.abandonAudioFocus(this)
        releasePlayer()
    }

    private fun createPlayer(autoplayResume: Boolean, isResume: Boolean) {
        releasePlayer()
        val texture = surfaceTexture ?: return
        // The surface can become available before the source prop has arrived. The
        // Java version ran into a NullPointerException here and swallowed it.
        val source = sourceMap ?: return
        try {
            val uriString = if (source.hasKey("uri")) source.getString("uri") else null
            val isNetwork = source.hasKey("isNetwork") && source.getBoolean("isNetwork")
            val autoplay = !source.hasKey("autoplay") || source.getBoolean("autoplay")
            val initType = if (source.hasKey("initType")) source.getInt("initType") else 1
            val mediaOptions = if (source.hasKey("mediaOptions")) source.getArray("mediaOptions") else null
            val initOptions = if (source.hasKey("initOptions")) source.getArray("initOptions") else null
            val hwDecoderEnabled = if (source.hasKey("hwDecoderEnabled")) source.getInt("hwDecoderEnabled") else null
            val hwDecoderForced = if (source.hasKey("hwDecoderForced")) source.getInt("hwDecoderForced") else null

            val lib = if (initType == 1) {
                LibVLC(context)
            } else {
                LibVLC(context, stringOptions(initOptions))
            }
            libvlc = lib
            val player = MediaPlayer(lib)
            mediaPlayer = player
            released = false
            setMutedModifier(muted)
            player.setEventListener(playerListener)
            Dialog.setCallbacks(lib, dialogCallbacks)

            val vlcOut = player.getVLCVout()
            if (videoWidth > 0 && videoHeight > 0) {
                vlcOut.setWindowSize(videoWidth, videoHeight)
                if (autoAspectRatio) {
                    player.setAspectRatio(null)
                    player.setScale(0f)
                }
            }

            val media = if (isNetwork) Media(lib, Uri.parse(uriString)) else Media(lib, uriString)
            media.setEventListener(mediaListener)
            // -1 is the spec's "not set" default, which Fabric sends for an
            // omitted field; the Legacy Architecture omits the key instead.
            if (hwDecoderEnabled != null && hwDecoderForced != null &&
                hwDecoderEnabled >= 0 && hwDecoderForced >= 0
            ) {
                media.setHWDecoderEnabled(hwDecoderEnabled >= 1, hwDecoderForced >= 1)
            }
            for (option in stringOptions(mediaOptions)) {
                media.addOption(option)
            }
            videoInfoHash = null
            player.setMedia(media)
            media.release()
            player.setScale(0f)
            subtitleUri?.let { player.addSlave(IMedia.Slave.Type.Subtitle, it, true) }

            if (!vlcOut.areViewsAttached()) {
                vlcOut.addCallback(voutCallback)
                vlcOut.setVideoSurface(texture)
                vlcOut.attachViews(newVideoLayoutListener)
            }
            if (isResume) {
                if (autoplayResume) {
                    player.play()
                }
            } else if (autoplay) {
                paused = false
                player.play()
            }
            eventEmitter.loadStart()

            startProgressUpdates()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create the player", e)
        }
    }

    private fun releasePlayer() {
        progressUpdateRunnable?.let { progressUpdateHandler.removeCallbacks(it) }
        progressUpdateRunnable = null

        val player = mediaPlayer
        val lib = libvlc
        mediaPlayer = null
        libvlc = null
        released = true
        // Both are set together in createPlayer, but `MediaPlayer(lib)` can throw
        // after libvlc was assigned. The Java version then crashed on the next
        // release with a NullPointerException on the player.
        if (player != null) {
            val vout = player.getVLCVout()
            vout.removeCallback(voutCallback)
            vout.detachViews()
            player.release()
        }
        lib?.release()
    }

    private fun startProgressUpdates() {
        if (mediaPlayer == null || progressUpdateInterval <= 0) {
            return
        }
        val runnable = object : Runnable {
            override fun run() {
                val player = mediaPlayer
                if (player != null && !paused) {
                    val map = Arguments.createMap()
                    val currentTime = player.time
                    val duration = player.length
                    map.putBoolean("isPlaying", player.isPlaying)
                    map.putDouble("position", player.position.toDouble())
                    map.putDouble("currentTime", currentTime.toDouble())
                    map.putDouble("duration", duration.toDouble())
                    // Declared by the spec and sent by iOS; Android never had it.
                    map.putDouble("remainingTime", (duration - currentTime).coerceAtLeast(0).toDouble())
                    updateVideoInfo(player)
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_PROGRESS)
                }
                progressUpdateHandler.postDelayed(this, progressUpdateInterval.roundToInt().toLong())
            }
        }
        progressUpdateRunnable = runnable
        progressUpdateHandler.postDelayed(runnable, 0)
    }

    private fun updateVideoInfo(player: MediaPlayer) {
        // Read once and use for both the hash and the payload. getAudioTracks() and
        // getSpuTracks() return null when there are no tracks, whatever the count
        // said a moment earlier.
        val audioTracks = if (player.audioTracksCount > 0) player.audioTracks else null
        val textTracks = if (player.spuTracksCount > 0) player.spuTracks else null
        val videoTrack: IMedia.VideoTrack? = player.currentVideoTrack
        val duration = player.length

        val hash = buildString {
            append("duration:").append(duration).append(";")
            if (audioTracks != null) {
                append("audioTracks:")
                for (track in audioTracks) append(track.id).append(":").append(track.name).append(",")
                append(";")
            }
            if (textTracks != null) {
                append("textTracks:")
                for (track in textTracks) append(track.id).append(":").append(track.name).append(",")
                append(";")
            }
            if (videoTrack != null) {
                append("videoSize:").append(videoTrack.width).append("x").append(videoTrack.height).append(";")
            }
        }

        // Only report when something changed.
        if (hash == videoInfoHash) {
            return
        }

        // Every field is always present, as the spec declares and iOS does. Android
        // used to leave out whatever was unknown yet, which made `videoSize`
        // undefined on the first onVideoLoad of most streams.
        val info = Arguments.createMap()
        info.putDouble("duration", duration.toDouble())
        info.putArray("audioTracks", trackArray(audioTracks ?: emptyArray()))
        info.putArray("textTracks", trackArray(textTracks ?: emptyArray()))
        val videoSize = Arguments.createMap()
        videoSize.putInt("width", videoTrack?.width ?: 0)
        videoSize.putInt("height", videoTrack?.height ?: 0)
        info.putMap("videoSize", videoSize)
        eventEmitter.sendEvent(info, VideoEventEmitter.EVENT_ON_LOAD)
        videoInfoHash = hash
    }

    private fun handleCertificateDialog(dialog: Dialog.QuestionDialog) {
        val title = dialog.title
        val text = dialog.text
        Log.i(TAG, "Certificate dialog - Title: $title, Text: $text")

        val isCertificateDialog = text != null &&
            (text.contains("certificate") || text.contains("SSL") || text.contains("TLS") || text.contains("cert"))
        if (isCertificateDialog) {
            if (acceptInvalidCertificates) {
                dialog.postAction(1) // Action 1 is "Accept"
                Log.i(TAG, "Auto-accepted certificate dialog")
            } else {
                dialog.postAction(2) // Action 2 is "Reject"
                Log.i(TAG, "Rejected certificate dialog (acceptInvalidCertificates=false)")
            }
        } else {
            dialog.dismiss()
            Log.i(TAG, "Dismissed non-certificate dialog")
        }
    }

    // -- Props ----------------------------------------------------------------

    fun setSrc(src: ReadableMap?) {
        sourceMap = src
        createPlayer(autoplayResume = true, isResume = false)
    }

    fun setSubtitleUri(uri: String?) {
        subtitleUri = uri
        // A cleared prop arrives as null, which addSlave does not accept.
        if (uri != null) {
            mediaPlayer?.addSlave(IMedia.Slave.Type.Subtitle, uri, true)
        }
    }

    fun setRateModifier(rate: Float) {
        mediaPlayer?.setRate(rate)
    }

    fun setProgressUpdateInterval(interval: Float) {
        progressUpdateInterval = interval
        createPlayer(autoplayResume = true, isResume = false)
    }

    fun setVolumeModifier(volume: Int) {
        mediaPlayer?.setVolume(volume)
    }

    fun setMutedModifier(muted: Boolean) {
        this.muted = muted
        val player = mediaPlayer ?: return
        if (muted) {
            val currentVolume = player.volume
            previousVolume = if (currentVolume > 0) currentVolume else 100
            player.setVolume(0)
        } else {
            player.setVolume(if (previousVolume > 0) previousVolume else 100)
        }
    }

    fun setPausedModifier(paused: Boolean) {
        Log.i("paused:", "$paused:$mediaPlayer")
        val player = mediaPlayer
        if (player == null) {
            createPlayer(autoplayResume = !paused, isResume = false)
            return
        }
        this.paused = paused
        if (paused) {
            player.pause()
        } else {
            player.play()
            Log.i("do play:", "true")
        }
    }

    @Suppress("UNUSED_PARAMETER")
    fun setRepeatModifier(repeat: Boolean) {
        // Never implemented on Android. `repeat` reaches VLC as `--repeat` in
        // source.initOptions instead; see VLCPlayer.tsx.
    }

    fun setAspectRatio(aspectRatio: String?) {
        if (!autoAspectRatio) {
            mediaPlayer?.setAspectRatio(aspectRatio)
        }
    }

    fun setAutoAspectRatio(auto: Boolean) {
        autoAspectRatio = auto
    }

    fun setAudioTrack(track: Int) {
        mediaPlayer?.setAudioTrack(track)
    }

    fun setTextTrack(track: Int) {
        mediaPlayer?.setSpuTrack(track)
    }

    fun setAcceptInvalidCertificates(accept: Boolean) {
        acceptInvalidCertificates = accept
        Log.i(TAG, "Set acceptInvalidCertificates to: $accept")
    }

    // -- Commands -------------------------------------------------------------

    fun setPosition(position: Float) {
        if (position in 0f..1f) {
            mediaPlayer?.setPosition(position)
        }
    }

    fun doResume(autoplay: Boolean) {
        createPlayer(autoplayResume = autoplay, isResume = true)
    }

    fun startRecording(recordingPath: String?) {
        val player = mediaPlayer ?: return
        if (recordingPath != null) {
            player.record(recordingPath)
        }
    }

    fun stopRecording() {
        mediaPlayer?.record(null)
    }

    fun stopPlayer() {
        mediaPlayer?.stop()
    }

    /** Saves the current frame to [path] and reports the result via onSnapshot. */
    fun doSnapshot(path: String): Boolean {
        if (mediaPlayer == null) {
            sendSnapshotResult(success = false, error = "MediaPlayer is null")
            return false
        }
        return try {
            val frame = getBitmap()
            if (frame == null) {
                sendSnapshotResult(success = false, error = "Failed to capture bitmap")
                return false
            }
            val file = File(path)
            // A bare file name has no parent. The Java version threw a
            // NullPointerException here and reported it as a failed snapshot.
            file.parentFile?.mkdirs()
            FileOutputStream(file).use { out ->
                val format = if (path.substringAfterLast('.') == "png") {
                    Bitmap.CompressFormat.PNG
                } else {
                    Bitmap.CompressFormat.JPEG
                }
                frame.compress(format, 100, out)
                out.flush()
            }
            frame.recycle()
            sendSnapshotResult(success = true, path = path)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Snapshot failed", e)
            sendSnapshotResult(success = false, error = e.message)
            false
        }
    }

    private fun sendSnapshotResult(success: Boolean, path: String? = null, error: String? = null) {
        val event = Arguments.createMap()
        event.putBoolean("success", success)
        if (path != null) event.putString("path", path)
        if (!success) event.putString("error", error)
        eventEmitter.sendEvent(event, VideoEventEmitter.EVENT_ON_SNAPSHOT)
    }

    fun cleanUpResources() {
        stopPlayback()
    }

    /**
     * Final teardown when React drops the view. Unlike [cleanUpResources], which
     * the `clear` prop also triggers on a view that lives on, this unregisters
     * the lifecycle listener — otherwise the context keeps every dropped player
     * view alive.
     */
    fun dispose() {
        cleanUpResources()
        reactContext.removeLifecycleEventListener(this)
    }

    private companion object {
        const val TAG = "VlcPlayerView"

        fun trackArray(tracks: Array<MediaPlayer.TrackDescription>): WritableArray {
            val array = WritableNativeArray()
            for (track in tracks) {
                val map = Arguments.createMap()
                map.putInt("id", track.id)
                map.putString("name", track.name)
                array.pushMap(map)
            }
            return array
        }

        /**
         * The string entries of an options array. The Java version iterated to
         * `size() - 1` and dropped the last option — on Android, the `--repeat`
         * the JS wrapper appends for `repeat` never reached VLC.
         */
        fun stringOptions(array: ReadableArray?): List<String> {
            if (array == null) return emptyList()
            val options = ArrayList<String>()
            for (i in 0 until array.size()) {
                if (array.getType(i) == ReadableType.String) {
                    array.getString(i)?.let { options.add(it) }
                }
            }
            return options
        }
    }
}
