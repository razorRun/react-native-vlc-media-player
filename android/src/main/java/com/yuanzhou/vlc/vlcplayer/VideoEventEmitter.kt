package com.yuanzhou.vlc.vlcplayer

import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event

/**
 * Sends the player's events to JS through the EventDispatcher.
 *
 * Architecture-agnostic: [UIManagerHelper] picks the dispatcher from the view's
 * react tag, and [Event.dispatchModern] falls back to the legacy emitter whenever
 * the view has no surface id — which is exactly the Old Architecture case. The
 * previous `getJSModule(RCTEventEmitter)` path only reached Fabric through the
 * interop layer.
 */
internal class VideoEventEmitter(private val view: View) {

    fun loadStart() {
        dispatch(EVENT_LOAD_START, Arguments.createMap())
    }

    fun onVideoStateChange(payload: WritableMap) {
        dispatch(EVENT_ON_VIDEO_STATE_CHANGE, payload)
    }

    fun sendEvent(payload: WritableMap, event: String) {
        dispatch(event, payload)
    }

    private fun dispatch(name: String, payload: WritableMap) {
        val viewId = view.id
        if (viewId == View.NO_ID) {
            // The mounting layer has not assigned a react tag yet, so there is
            // nothing to address the event to.
            return
        }
        // The spec declares `target` on the payloads, and iOS has always sent it.
        payload.putInt("target", viewId)

        val context = UIManagerHelper.getReactContext(view)
        UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
            ?.dispatchEvent(VideoEvent(UIManagerHelper.getSurfaceId(view), viewId, name, payload))
    }

    private class VideoEvent(
        surfaceId: Int,
        viewId: Int,
        private val name: String,
        private val payload: WritableMap,
    ) : Event<VideoEvent>(surfaceId, viewId) {

        override fun getEventName(): String = name

        override fun getEventData(): WritableMap = payload

        // Events coalesce by default: of two with the same name and view, only
        // the newer reaches JS. The RCTEventEmitter path never did that, and
        // onVideoEnd, onSnapshot or two state changes in one frame must not be
        // dropped.
        override fun canCoalesce(): Boolean = false
    }

    companion object {
        const val EVENT_LOAD_START = "onVideoLoadStart"
        const val EVENT_ON_OPEN = "onVideoOpen"
        const val EVENT_PROGRESS = "onVideoProgress"
        const val EVENT_SEEK = "onVideoSeek"
        const val EVENT_END = "onVideoEnd"
        const val EVENT_ON_IS_PLAYING = "onVideoPlaying"
        const val EVENT_ON_VIDEO_STATE_CHANGE = "onVideoStateChange"
        const val EVENT_ON_VIDEO_STOPPED = "onVideoStopped"
        const val EVENT_ON_ERROR = "onVideoError"
        const val EVENT_ON_VIDEO_BUFFERING = "onVideoBuffering"
        const val EVENT_ON_PAUSED = "onVideoPaused"
        const val EVENT_ON_LOAD = "onVideoLoad"
        const val EVENT_RECORDING_STATE = "onRecordingState"
        const val EVENT_ON_SNAPSHOT = "onSnapshot"

        /** Every event the view manager registers as a direct event. */
        val Events = arrayOf(
            EVENT_LOAD_START,
            EVENT_PROGRESS,
            EVENT_SEEK,
            EVENT_END,
            EVENT_ON_IS_PLAYING,
            EVENT_ON_VIDEO_STATE_CHANGE,
            EVENT_ON_OPEN,
            EVENT_ON_PAUSED,
            EVENT_ON_VIDEO_BUFFERING,
            EVENT_ON_ERROR,
            EVENT_ON_VIDEO_STOPPED,
            EVENT_ON_LOAD,
            EVENT_RECORDING_STATE,
            EVENT_ON_SNAPSHOT,
        )
    }
}
