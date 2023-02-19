package com.yuanzhou.vlc.vlcplayer;

import androidx.annotation.StringDef;
import android.util.Log;
import android.view.View;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;


import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

class VideoEventEmitter {

    private final RCTEventEmitter eventEmitter;

    private int viewId = View.NO_ID;

    VideoEventEmitter(ReactContext reactContext) {
        this.eventEmitter = reactContext.getJSModule(RCTEventEmitter.class);
    }

    public static final String EVENT_LOAD_START = "onVideoLoadStart";
    public static final String EVENT_ON_OPEN = "onVideoOpen";
    public static final String EVENT_PROGRESS = "onVideoProgress";
    public static final String EVENT_SEEK = "onVideoSeek";
    public static final String EVENT_END = "onVideoEnd";
    public static final String EVENT_SNAPSHOT = "onSnapshot";
    public static final String EVENT_ON_IS_PLAYING= "onVideoPlaying";
    public static final String EVENT_ON_VIDEO_STATE_CHANGE = "onVideoStateChange";
    public static final String EVENT_ON_VIDEO_STOPPED = "onVideoStopped";
    public static final String EVENT_ON_ERROR = "onVideoError";
    public static final String EVENT_ON_VIDEO_BUFFERING = "onVideoBuffering";
    public static final String EVENT_ON_PAUSED = "onVideoPaused";
    public static final String EVENT_ON_LOAD = "onVideoLoad";

    static final String[] Events = {
            EVENT_LOAD_START,
            EVENT_PROGRESS,
            EVENT_SEEK,
            EVENT_END,
            EVENT_SNAPSHOT,
            EVENT_ON_IS_PLAYING,
            EVENT_ON_VIDEO_STATE_CHANGE,
            EVENT_ON_OPEN,
            EVENT_ON_PAUSED,
            EVENT_ON_VIDEO_BUFFERING,
            EVENT_ON_ERROR,
            EVENT_ON_VIDEO_STOPPED,
            EVENT_ON_LOAD
    };

    @Retention(RetentionPolicy.SOURCE)
    @StringDef({
            EVENT_LOAD_START,
            EVENT_PROGRESS,
            EVENT_SEEK,
            EVENT_END,
            EVENT_SNAPSHOT,
            EVENT_ON_IS_PLAYING,
            EVENT_ON_VIDEO_STATE_CHANGE,
            EVENT_ON_OPEN,
            EVENT_ON_PAUSED,
            EVENT_ON_VIDEO_BUFFERING,
            EVENT_ON_ERROR,
            EVENT_ON_VIDEO_STOPPED,
            EVENT_ON_LOAD
    })

    @interface VideoEvents {
    }

    private static final String EVENT_PROP_ERROR = "error";
    private static final String EVENT_PROP_ERROR_STRING = "errorString";
    private static final String EVENT_PROP_ERROR_EXCEPTION = "";


    void setViewId(int viewId) {
        this.viewId = viewId;
    }

    /**
     * MideaPlayer初始化完毕回调
     */
    void loadStart() {
        WritableMap event = Arguments.createMap();
        receiveEvent(EVENT_LOAD_START, event);
    }


    /**
     * 视频进度改变回调
     * @param currentPosition
     * @param bufferedDuration
     */
    void progressChanged(double currentPosition, double bufferedDuration) {
        WritableMap event = Arguments.createMap();
        event.putDouble("currentTime", currentPosition);
        event.putDouble("duration", bufferedDuration);
        receiveEvent(EVENT_PROGRESS, event);
    }


    void error(String errorString, Exception exception) {
        WritableMap error = Arguments.createMap();
        error.putString(EVENT_PROP_ERROR_STRING, errorString);
        error.putString(EVENT_PROP_ERROR_EXCEPTION, exception.getMessage());
        WritableMap event = Arguments.createMap();
        event.putMap(EVENT_PROP_ERROR, error);
        //receiveEvent(EVENT_ERROR, event);
    }

    /**
     * 截图回调
     * @param result
     */
    void onSnapshot(int result){
        WritableMap map = Arguments.createMap();
        map.putInt("isSuccess",result);
        receiveEvent(EVENT_SNAPSHOT, map);
    }

    /**
     * 是否播放回调
     * @param isPlaying
     */
    void isPlaying(boolean isPlaying){
        WritableMap map = Arguments.createMap();
        map.putBoolean("isPlaying",isPlaying);
        receiveEvent(EVENT_ON_IS_PLAYING, map);
    }

    /**
     * 视频状态改变回调
     * @param map
     */
    void onVideoStateChange(WritableMap map){
        receiveEvent(EVENT_ON_VIDEO_STATE_CHANGE, map);
    }

    void sendEvent(WritableMap map, String event) {
        receiveEvent(event, map);
    }

    private void receiveEvent(@VideoEvents String type, WritableMap event) {
        eventEmitter.receiveEvent(viewId, type, event);
    }

}
