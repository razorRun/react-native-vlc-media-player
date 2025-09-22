package com.yuanzhou.vlc.vlcplayer;

import android.content.Context;
import android.text.TextUtils;

import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

import javax.annotation.Nullable;

public class ReactVlcPlayerViewManager extends SimpleViewManager<ReactVlcPlayerView> {

    private static final String REACT_CLASS = "RCTVLCPlayer";

    private static final String PROP_SRC = "source";
    private static final String PROP_SRC_URI = "uri";
    private static final String PROP_SUBTITLE_URI = "subtitleUri";
    private static final String PROP_SRC_TYPE = "type";
    private static final String PROP_REPEAT = "repeat";
    private static final String PROP_PAUSED = "paused";
    private static final String PROP_MUTED = "muted";
    private static final String PROP_VOLUME = "volume";
    private static final String PROP_SEEK = "seek";
    private static final String PROP_RESUME = "resume";
    private static final String PROP_RATE = "rate";
    private static final String PROP_VIDEO_ASPECT_RATIO = "videoAspectRatio";
    private static final String PROP_SRC_IS_NETWORK = "isNetwork";
    private static final String PROP_AUTO_ASPECT_RATIO = "autoAspectRatio";
    private static final String PROP_CLEAR = "clear";
    private static final String PROP_PROGRESS_UPDATE_INTERVAL = "progressUpdateInterval";
    private static final String PROP_TEXT_TRACK = "textTrack";
    private static final String PROP_AUDIO_TRACK = "audioTrack";
    private static final String PROP_RECORDING_PATH = "recordingPath";
    private static final String PROP_ACCEPT_INVALID_CERTIFICATES = "acceptInvalidCertificates";


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

    @ReactProp(name = PROP_CLEAR)
    public void setClear(final ReactVlcPlayerView videoView, final boolean clear) {
        videoView.cleanUpResources();
    }


    @ReactProp(name = PROP_SRC)
    public void setSrc(final ReactVlcPlayerView videoView, @Nullable ReadableMap src) {
        Context context = videoView.getContext().getApplicationContext();
        String uriString = src.hasKey(PROP_SRC_URI) ? src.getString(PROP_SRC_URI) : null;
        String extension = src.hasKey(PROP_SRC_TYPE) ? src.getString(PROP_SRC_TYPE) : null;
        boolean isNetStr = src.getBoolean(PROP_SRC_IS_NETWORK) ? src.getBoolean(PROP_SRC_IS_NETWORK) : false;
        boolean autoplay = src.getBoolean("autoplay") ? src.getBoolean("autoplay") : true;
        if (TextUtils.isEmpty(uriString)) {
            return;
        }
        videoView.setSrc(src);

    }

    @ReactProp(name = PROP_SUBTITLE_URI)
    public void setSubtitleUri(final ReactVlcPlayerView videoView, final String subtitleUri) {
        videoView.setSubtitleUri(subtitleUri);
    }

    @ReactProp(name = PROP_REPEAT, defaultBoolean = false)
    public void setRepeat(final ReactVlcPlayerView videoView, final boolean repeat) {
        videoView.setRepeatModifier(repeat);
    }


    @ReactProp(name = PROP_PROGRESS_UPDATE_INTERVAL, defaultFloat = 0f )
    public void setInterval(final ReactVlcPlayerView videoView, final float interval) {
        videoView.setmProgressUpdateInterval(interval);
    }

    @ReactProp(name = PROP_PAUSED, defaultBoolean = false)
    public void setPaused(final ReactVlcPlayerView videoView, final boolean paused) {
        videoView.setPausedModifier(paused);
    }

    @ReactProp(name = PROP_MUTED, defaultBoolean = false)
    public void setMuted(final ReactVlcPlayerView videoView, final boolean muted) {
        videoView.setMutedModifier(muted);
    }

    @ReactProp(name = PROP_VOLUME, defaultFloat = 1.0f)
    public void setVolume(final ReactVlcPlayerView videoView, final float volume) {
        videoView.setVolumeModifier((int)volume);
    }


    @ReactProp(name = PROP_SEEK)
    public void setSeek(final ReactVlcPlayerView videoView, final float seek) {
        videoView.setPosition(seek);
    }

    @ReactProp(name = PROP_AUTO_ASPECT_RATIO, defaultBoolean = false)
    public void setAutoAspectRatio(final ReactVlcPlayerView videoView, final boolean autoPlay) {
        videoView.setAutoAspectRatio(autoPlay);
    }

    @ReactProp(name = PROP_RESUME, defaultBoolean = true)
    public void setResume(final ReactVlcPlayerView videoView, final boolean autoPlay) {
        videoView.doResume(autoPlay);
    }


    @ReactProp(name = PROP_RATE)
    public void setRate(final ReactVlcPlayerView videoView, final float rate) {
        videoView.setRateModifier(rate);
    }

    @ReactProp(name = PROP_VIDEO_ASPECT_RATIO)
    public void setVideoAspectRatio(final ReactVlcPlayerView videoView, final String aspectRatio) {
        videoView.setAspectRatio(aspectRatio);
    }

    @ReactProp(name = PROP_AUDIO_TRACK)
    public void setAudioTrack(final ReactVlcPlayerView videoView, final int audioTrack) {
        videoView.setAudioTrack(audioTrack);
    }

    @ReactProp(name = PROP_TEXT_TRACK)
    public void setTextTrack(final ReactVlcPlayerView videoView, final int textTrack) {
        videoView.setTextTrack(textTrack);
    }

    @ReactProp(name = PROP_ACCEPT_INVALID_CERTIFICATES, defaultBoolean = false)
    public void setAcceptInvalidCertificates(final ReactVlcPlayerView videoView, final boolean accept) {
        videoView.setAcceptInvalidCertificates(accept);
    }

    public void startRecording(final ReactVlcPlayerView videoView, final String recordingPath) {
        videoView.startRecording(recordingPath);
    }

    public void stopRecording(final ReactVlcPlayerView videoView) {
        videoView.stopRecording();
    }

    public void stopPlayer(final ReactVlcPlayerView videoView) {
        videoView.stopPlayer();
    }

    public void snapshot(final ReactVlcPlayerView videoView, final String path) {
        videoView.doSnapshot(path);
    }

    @Override
    public Map<String, Integer> getCommandsMap() {
        return MapBuilder.of(
            "startRecording", 1,
            "stopRecording", 2,
            "snapshot", 3
        );
    }

    @Override
    public void receiveCommand(ReactVlcPlayerView root, int commandId, @Nullable ReadableArray args) {
        switch (commandId) {
            case 1:
                if (args != null && args.size() > 0 && !args.isNull(0)) {
                    String path = args.getString(0);
                    root.startRecording(path);
                }
                break;

            case 2:
                root.stopRecording();
                break;

            case 3:
                if (args != null && args.size() > 0 && !args.isNull(0)) {
                    String path = args.getString(0);
                    root.doSnapshot(path);
                }
                break;

            default:
                break;
        }
    }

    private boolean startsWithValidScheme(String uriString) {
        return uriString.startsWith("http://")
                || uriString.startsWith("https://")
                || uriString.startsWith("content://")
                || uriString.startsWith("file://")
                || uriString.startsWith("asset://");
    }
}
