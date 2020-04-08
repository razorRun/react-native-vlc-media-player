package com.yuanzhou.vlc.vlcplayer;

import android.content.Context;
import android.net.Uri;
import android.text.TextUtils;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

import javax.annotation.Nullable;

public class ReactVlcPlayerViewManager extends SimpleViewManager<ReactVlcPlayerView> {

    private static final String REACT_CLASS = "RCTVLCPlayer";

    private static final String PROP_SRC = "src";
    private static final String PROP_SRC_URI = "uri";
    private static final String PROP_SRC_TYPE = "type";
    private static final String PROP_RESIZE_MODE = "resizeMode";
    private static final String PROP_REPEAT = "repeat";
    private static final String PROP_PAUSED = "paused";
    private static final String PROP_MUTED = "muted";
    private static final String PROP_VOLUME = "volume";
    private static final String PROP_PROGRESS_UPDATE_INTERVAL = "progressUpdateInterval";
    private static final String PROP_SEEK = "seek";
    private static final String PROP_RESUME = "resume";
    private static final String PROP_RATE = "rate";
    private static final String PROP_PLAY_IN_BACKGROUND = "playInBackground";
    private static final String PROP_DISABLE_FOCUS = "disableFocus";
    private static final String PROP_VIDEO_ASPECT_RATIO = "videoAspectRatio";
    public static final String PROP_SRC_IS_NETWORK = "isNetwork";
    public static final String PROP_SRC_IS_ASSET = "isAsset";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    protected ReactVlcPlayerView createViewInstance(ThemedReactContext themedReactContext) {
        return new ReactVlcPlayerView(themedReactContext);
    }

    @Override
    public void onDropViewInstance(ReactVlcPlayerView view) {
        view.cleanUpResources();
    }

    @Override
    public @Nullable Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        MapBuilder.Builder<String, Object> builder = MapBuilder.builder();
        for (String event : VideoEventEmitter.Events) {
            builder.put(event, MapBuilder.of("registrationName", event));
        }
        return builder.build();
    }

    @ReactProp(name = PROP_SRC)
    public void setSrc(final ReactVlcPlayerView videoView, @Nullable ReadableMap src) {
        Context context = videoView.getContext().getApplicationContext();
        String uriString = src.hasKey(PROP_SRC_URI) ? src.getString(PROP_SRC_URI) : null;
        String extension = src.hasKey(PROP_SRC_TYPE) ? src.getString(PROP_SRC_TYPE) : null;
        boolean isNetStr = src.getBoolean(PROP_SRC_IS_NETWORK) ? src.getBoolean(PROP_SRC_IS_NETWORK) : false;

        if (TextUtils.isEmpty(uriString)) {
            return;
        }
        videoView.setSrc(uriString, isNetStr);

    }

    @ReactProp(name = PROP_RESIZE_MODE)
    public void setResizeMode(final ReactVlcPlayerView videoView, final String resizeModeOrdinalString) {
        //videoView.setResizeModeModifier(convertToIntDef(resizeModeOrdinalString));
    }

    @ReactProp(name = PROP_REPEAT, defaultBoolean = false)
    public void setRepeat(final ReactVlcPlayerView videoView, final boolean repeat) {
        videoView.setRepeatModifier(repeat);
    }

    @ReactProp(name = PROP_PAUSED, defaultBoolean = false)
    public void setPaused(final ReactVlcPlayerView videoView, final boolean paused) {
        videoView.setPausedModifier(paused);
    }

    @ReactProp(name = PROP_MUTED, defaultBoolean = false)
    public void setMuted(final ReactVlcPlayerView videoView, final boolean muted) {
        //videoView.setMutedModifier(muted);
    }

    @ReactProp(name = PROP_VOLUME, defaultFloat = 1.0f)
    public void setVolume(final ReactVlcPlayerView videoView, final float volume) {
        videoView.setVolumeModifier((int)volume);
    }

    /*@ReactProp(name = PROP_PROGRESS_UPDATE_INTERVAL, defaultFloat = 250.0f)
    public void setProgressUpdateInterval(final ReactVlcPlayerView videoView, final float progressUpdateInterval) {
        //videoView.setProgressUpdateInterval(progressUpdateInterval);
    }*/

    @ReactProp(name = PROP_SEEK)
    public void setSeek(final ReactVlcPlayerView videoView, final float seek) {
        videoView.seekTo(Math.round(seek * 1000f));
        //videoView.seekTo(seek);
    }

    @ReactProp(name = PROP_RESUME, defaultBoolean = false)
    public void setResume(final ReactVlcPlayerView videoView, final boolean autoPlay) {
        videoView.doResume(autoPlay);
    }

    @ReactProp(name = PROP_RATE)
    public void setRate(final ReactVlcPlayerView videoView, final float rate) {
        videoView.setRateModifier(rate);
    }

    @ReactProp(name = PROP_PLAY_IN_BACKGROUND, defaultBoolean = false)
    public void setPlayInBackground(final ReactVlcPlayerView videoView, final boolean playInBackground) {
        videoView.setPlayInBackground(playInBackground);
    }

    @ReactProp(name = PROP_DISABLE_FOCUS, defaultBoolean = false)
    public void setDisableFocus(final ReactVlcPlayerView videoView, final boolean disableFocus) {
        videoView.setDisableFocus(disableFocus);
    }

    @ReactProp(name = PROP_VIDEO_ASPECT_RATIO)
    public void setVideoAspectRatio(final ReactVlcPlayerView videoView, final String aspectRatio) {
        videoView.setAspectRatio(aspectRatio);
    }


    private boolean startsWithValidScheme(String uriString) {
        return uriString.startsWith("http://")
                || uriString.startsWith("https://")
                || uriString.startsWith("content://")
                || uriString.startsWith("file://")
                || uriString.startsWith("asset://");
    }
}
