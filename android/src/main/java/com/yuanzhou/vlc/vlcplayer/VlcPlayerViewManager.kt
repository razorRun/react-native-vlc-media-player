package com.yuanzhou.vlc.vlcplayer

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * The one view manager for both architectures.
 *
 * Its base class comes from `src/newarch` or `src/oldarch`, picked in
 * build.gradle. On the New Architecture props and commands arrive through the
 * codegen delegate; on the Legacy Architecture props arrive through the
 * `@ReactProp` annotations below and commands through the base class. The
 * annotations are inert on the New Architecture.
 */
class VlcPlayerViewManager : VlcPlayerViewManagerSpec<VlcPlayerView>() {

    override fun getName(): String = NAME

    override fun createViewInstance(reactContext: ThemedReactContext): VlcPlayerView =
        VlcPlayerView(reactContext)

    override fun onDropViewInstance(view: VlcPlayerView) {
        view.dispose()
        super.onDropViewInstance(view)
    }

    // Only read on the Legacy Architecture, where the view config comes from the
    // native constants; Fabric uses the static view config codegen generates.
    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        VideoEventEmitter.Events.associateWith { mapOf("registrationName" to it) }

    // -- Props ----------------------------------------------------------------

    @ReactProp(name = PROP_SOURCE)
    override fun setSource(view: VlcPlayerView, value: ReadableMap?) {
        val uri = if (value != null && value.hasKey("uri")) value.getString("uri") else null
        if (uri.isNullOrEmpty()) {
            return
        }
        view.setSrc(value)
    }

    @ReactProp(name = PROP_SUBTITLE_URI)
    override fun setSubtitleUri(view: VlcPlayerView, value: String?) {
        view.setSubtitleUri(value)
    }

    @ReactProp(name = PROP_PAUSED, defaultBoolean = false)
    override fun setPaused(view: VlcPlayerView, value: Boolean) {
        view.setPausedModifier(value)
    }

    @ReactProp(name = PROP_MUTED, defaultBoolean = false)
    override fun setMuted(view: VlcPlayerView, value: Boolean) {
        view.setMutedModifier(value)
    }

    @ReactProp(name = PROP_SEEK)
    override fun setSeek(view: VlcPlayerView, value: Float) {
        view.setPosition(value)
    }

    @ReactProp(name = PROP_RATE)
    override fun setRate(view: VlcPlayerView, value: Float) {
        view.setRateModifier(value)
    }

    @ReactProp(name = PROP_RESUME, defaultBoolean = true)
    override fun setResume(view: VlcPlayerView, value: Boolean) {
        view.doResume(value)
    }

    @ReactProp(name = PROP_VIDEO_ASPECT_RATIO)
    override fun setVideoAspectRatio(view: VlcPlayerView, value: String?) {
        view.setAspectRatio(value)
    }

    @ReactProp(name = PROP_AUDIO_TRACK)
    override fun setAudioTrack(view: VlcPlayerView, value: Int) {
        view.setAudioTrack(value)
    }

    @ReactProp(name = PROP_TEXT_TRACK)
    override fun setTextTrack(view: VlcPlayerView, value: Int) {
        view.setTextTrack(value)
    }

    @ReactProp(name = PROP_ACCEPT_INVALID_CERTIFICATES, defaultBoolean = false)
    override fun setAcceptInvalidCertificates(view: VlcPlayerView, value: Boolean) {
        view.setAcceptInvalidCertificates(value)
    }

    @ReactProp(name = PROP_REPEAT, defaultBoolean = false)
    override fun setRepeat(view: VlcPlayerView, value: Boolean) {
        view.setRepeatModifier(value)
    }

    @ReactProp(name = PROP_VOLUME, defaultFloat = 1.0f)
    override fun setVolume(view: VlcPlayerView, value: Float) {
        view.setVolumeModifier(value.toInt())
    }

    @ReactProp(name = PROP_AUTO_ASPECT_RATIO, defaultBoolean = false)
    override fun setAutoAspectRatio(view: VlcPlayerView, value: Boolean) {
        view.setAutoAspectRatio(value)
    }

    @ReactProp(name = PROP_PROGRESS_UPDATE_INTERVAL, defaultFloat = 0f)
    override fun setProgressUpdateInterval(view: VlcPlayerView, value: Float) {
        view.setProgressUpdateInterval(value)
    }

    @ReactProp(name = PROP_CLEAR)
    override fun setClear(view: VlcPlayerView, value: Boolean) {
        // Setting the prop at all tears the player down, whatever its value.
        view.cleanUpResources()
    }

    // iOS-only props. The codegen interface requires a setter for every prop in
    // the spec; without @ReactProp they stay unknown to the Legacy Architecture,
    // as they always were.
    override fun setAutoplay(view: VlcPlayerView, value: Boolean) {}

    override fun setSnapshotPath(view: VlcPlayerView, value: String?) {}

    // -- Commands -------------------------------------------------------------

    override fun startRecording(view: VlcPlayerView, path: String?) {
        view.startRecording(path)
    }

    override fun stopRecording(view: VlcPlayerView) {
        view.stopRecording()
    }

    override fun stopPlayer(view: VlcPlayerView) {
        view.stopPlayer()
    }

    override fun snapshot(view: VlcPlayerView, path: String?) {
        if (path != null) {
            view.doSnapshot(path)
        }
    }

    override fun seek(view: VlcPlayerView, position: Float) {
        view.setPosition(position)
    }

    override fun applyResume(view: VlcPlayerView, isResume: Boolean) {
        view.doResume(isResume)
    }

    override fun applyPaused(view: VlcPlayerView, paused: Boolean) {
        view.setPausedModifier(paused)
    }

    override fun applyAutoAspectRatio(view: VlcPlayerView, isAuto: Boolean) {
        view.setAutoAspectRatio(isAuto)
    }

    override fun applyAspectRatio(view: VlcPlayerView, ratio: String?) {
        view.setAspectRatio(ratio)
    }

    private companion object {
        /**
         * The same on both architectures, and the name in
         * VlcPlayerViewNativeComponent.ts. It used to be `RCTVLCPlayer`, which
         * Fabric never matched to the generated component.
         */
        const val NAME = "VlcPlayerView"

        const val PROP_SOURCE = "source"
        const val PROP_SUBTITLE_URI = "subtitleUri"
        const val PROP_PAUSED = "paused"
        const val PROP_MUTED = "muted"
        const val PROP_SEEK = "seek"
        const val PROP_RATE = "rate"
        const val PROP_RESUME = "resume"
        const val PROP_VIDEO_ASPECT_RATIO = "videoAspectRatio"
        const val PROP_AUDIO_TRACK = "audioTrack"
        const val PROP_TEXT_TRACK = "textTrack"
        const val PROP_ACCEPT_INVALID_CERTIFICATES = "acceptInvalidCertificates"
        const val PROP_REPEAT = "repeat"
        const val PROP_VOLUME = "volume"
        const val PROP_AUTO_ASPECT_RATIO = "autoAspectRatio"
        const val PROP_PROGRESS_UPDATE_INTERVAL = "progressUpdateInterval"
        const val PROP_CLEAR = "clear"
    }
}
