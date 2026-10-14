package com.yuanzhou.vlc.vlcplayer

import android.view.View
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager

/**
 * Legacy Architecture base of [VlcPlayerViewManager]. Phase 3 deletes this file.
 *
 * Mirrors the codegen interface the New Architecture base implements, so the
 * manager compiles unchanged against either base. Props reach the manager through
 * its `@ReactProp` annotations here; commands have no generated delegate on this
 * path, so they are resolved by name below.
 */
abstract class VlcPlayerViewManagerSpec<T : View> : SimpleViewManager<T>() {

    abstract fun setSource(view: T, value: ReadableMap?)
    abstract fun setSubtitleUri(view: T, value: String?)
    abstract fun setPaused(view: T, value: Boolean)
    abstract fun setMuted(view: T, value: Boolean)
    abstract fun setSeek(view: T, value: Float)
    abstract fun setRate(view: T, value: Float)
    abstract fun setResume(view: T, value: Boolean)
    abstract fun setVideoAspectRatio(view: T, value: String?)
    abstract fun setAudioTrack(view: T, value: Int)
    abstract fun setTextTrack(view: T, value: Int)
    abstract fun setAcceptInvalidCertificates(view: T, value: Boolean)
    abstract fun setAutoplay(view: T, value: Boolean)
    abstract fun setSnapshotPath(view: T, value: String?)
    abstract fun setRepeat(view: T, value: Boolean)
    abstract fun setVolume(view: T, value: Float)
    abstract fun setAutoAspectRatio(view: T, value: Boolean)
    abstract fun setProgressUpdateInterval(view: T, value: Float)
    abstract fun setClear(view: T, value: Boolean)

    abstract fun startRecording(view: T, path: String?)
    abstract fun stopRecording(view: T)
    abstract fun stopPlayer(view: T)
    abstract fun snapshot(view: T, path: String?)
    abstract fun seek(view: T, position: Float)
    abstract fun applyResume(view: T, isResume: Boolean)
    abstract fun applyPaused(view: T, paused: Boolean)
    abstract fun applyAutoAspectRatio(view: T, isAuto: Boolean)
    abstract fun applyAspectRatio(view: T, ratio: String?)

    override fun receiveCommand(root: T, commandId: String, args: ReadableArray?) {
        when (commandId) {
            "startRecording" -> startRecording(root, stringArg(args))
            "stopRecording" -> stopRecording(root)
            "stopPlayer" -> stopPlayer(root)
            "snapshot" -> snapshot(root, stringArg(args))
            "seek" -> if (args != null && hasArg(args)) seek(root, args.getDouble(0).toFloat())
            "applyResume" -> if (args != null && hasArg(args)) applyResume(root, args.getBoolean(0))
            "applyPaused" -> if (args != null && hasArg(args)) applyPaused(root, args.getBoolean(0))
            "applyAutoAspectRatio" ->
                if (args != null && hasArg(args)) applyAutoAspectRatio(root, args.getBoolean(0))
            "applyAspectRatio" -> applyAspectRatio(root, stringArg(args))
        }
    }

    /**
     * Retained for anything still dispatching integer ids by hand. codegen
     * dispatches command names, so the String overload above is the live path.
     */
    @Deprecated("Dispatch commands by name")
    override fun receiveCommand(root: T, commandId: Int, args: ReadableArray?) {
        if (commandId in 1..COMMANDS.size) {
            receiveCommand(root, COMMANDS[commandId - 1], args)
        }
    }

    override fun getCommandsMap(): Map<String, Int> =
        COMMANDS.withIndex().associate { (index, name) -> name to index + 1 }

    private companion object {
        /** The first three keep their historical integer ids. */
        val COMMANDS = listOf(
            "startRecording",
            "stopRecording",
            "snapshot",
            "stopPlayer",
            "seek",
            "applyResume",
            "applyPaused",
            "applyAutoAspectRatio",
            "applyAspectRatio",
        )

        fun hasArg(args: ReadableArray): Boolean = args.size() > 0 && !args.isNull(0)

        fun stringArg(args: ReadableArray?): String? =
            if (args != null && hasArg(args)) args.getString(0) else null
    }
}
