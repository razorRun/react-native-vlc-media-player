package com.yuanzhou.vlc.vlcplayer;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.SurfaceTexture;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableArray;

import com.facebook.react.uimanager.ThemedReactContext;

import org.videolan.libvlc.interfaces.IVLCVout;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.Dialog;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;


@SuppressLint("ViewConstructor")
class ReactVlcPlayerView extends TextureView implements
        LifecycleEventListener,
        TextureView.SurfaceTextureListener,
        AudioManager.OnAudioFocusChangeListener {

    private static final String TAG = "ReactVlcPlayerView";
    private final String tag = "ReactVlcPlayerView";

    private final VideoEventEmitter eventEmitter;
    private LibVLC libvlc;
    private MediaPlayer mMediaPlayer = null;
    private boolean mMuted = false;
    private boolean isSurfaceViewDestory;
    private String src;
    private String _subtitleUri;
    private boolean netStrTag;
    private ReadableMap srcMap;
    private int mVideoHeight = 0;
    private TextureView surfaceView;
    private Surface surfaceVideo;
    private int mVideoWidth = 0;
    private int mVideoVisibleHeight = 0;
    private int mVideoVisibleWidth = 0;
    private int mSarNum = 0;
    private int mSarDen = 0;
    private int screenWidth = 0;
    private int screenHeight = 0;

    private boolean isPaused = true;
    private boolean isHostPaused = false;
    private int preVolume = 100;
    private boolean autoAspectRatio = false;
    private boolean acceptInvalidCertificates = false;

    private float mProgressUpdateInterval = 0;
    private Handler mProgressUpdateHandler = new Handler();
    private Runnable mProgressUpdateRunnable = null;

    private final ThemedReactContext themedReactContext;
    private final AudioManager audioManager;

    private WritableMap mVideoInfo = null;
    private String mVideoInfoHash = null;


    public ReactVlcPlayerView(ThemedReactContext context) {
        super(context);
        this.eventEmitter = new VideoEventEmitter(context);
        this.themedReactContext = context;
        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenHeight = dm.heightPixels;
        screenWidth = dm.widthPixels;
        this.setSurfaceTextureListener(this);

        this.addOnLayoutChangeListener(onLayoutChangeListener);
    }


    @Override
    public void setId(int id) {
        super.setId(id);
        eventEmitter.setViewId(id);
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        //createPlayer();
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        stopPlayback();
    }

    // LifecycleEventListener implementation

    @Override
    public void onHostResume() {
        if (mMediaPlayer != null && isSurfaceViewDestory && isHostPaused) {
            IVLCVout vlcOut = mMediaPlayer.getVLCVout();
            if (!vlcOut.areViewsAttached()) {
                // vlcOut.setVideoSurface(this.getHolder().getSurface(), this.getHolder());
                vlcOut.attachViews(onNewVideoLayoutListener);
                isSurfaceViewDestory = false;
                isPaused = false;
                // this.getHolder().setKeepScreenOn(true);
                mMediaPlayer.play();
            }
        }
    }


    @Override
    public void onHostPause() {
        if (!isPaused && mMediaPlayer != null) {
            isPaused = true;
            isHostPaused = true;
            mMediaPlayer.pause();
            // this.getHolder().setKeepScreenOn(false);
            WritableMap map = Arguments.createMap();
            map.putString("type", "Paused");
            eventEmitter.onVideoStateChange(map);
        }
        Log.i("onHostPause", "---------onHostPause------------>");
    }


    @Override
    public void onHostDestroy() {
        stopPlayback();
    }


    // AudioManager.OnAudioFocusChangeListener implementation
    @Override
    public void onAudioFocusChange(int focusChange) {
    }

    private void setProgressUpdateRunnable() {
        if (mMediaPlayer != null && mProgressUpdateInterval > 0){
            new Thread() {
                @Override
                public void run() {
                    super.run();

                    mProgressUpdateRunnable = new Runnable() {
                        @Override
                        public void run() {
                            if (mMediaPlayer != null && !isPaused) {
                                long currentTime = 0;
                                long totalLength = 0;
                                WritableMap event = Arguments.createMap();
                                boolean isPlaying = mMediaPlayer.isPlaying();
                                currentTime = mMediaPlayer.getTime();
                                float position = mMediaPlayer.getPosition();
                                totalLength = mMediaPlayer.getLength();
                                WritableMap map = Arguments.createMap();
                                map.putBoolean("isPlaying", isPlaying);
                                map.putDouble("position", position);
                                map.putDouble("currentTime", currentTime);
                                map.putDouble("duration", totalLength);
                                updateVideoInfo();
                                eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_PROGRESS);
                            }

                            mProgressUpdateHandler.postDelayed(mProgressUpdateRunnable, Math.round(mProgressUpdateInterval));
                        }
                    };

                    mProgressUpdateHandler.postDelayed(mProgressUpdateRunnable, 0);
                }
            }.start();
        }
    }


    /*************
     * Events  Listener
     *************/

    private View.OnLayoutChangeListener onLayoutChangeListener = new View.OnLayoutChangeListener() {

        @Override
        public void onLayoutChange(View view, int i, int i1, int i2, int i3, int i4, int i5, int i6, int i7) {
            if (view.getWidth() > 0 && view.getHeight() > 0) {
                mVideoWidth = view.getWidth(); // 获取宽度
                mVideoHeight = view.getHeight(); // 获取高度
                if (mMediaPlayer != null) {
                    IVLCVout vlcOut = mMediaPlayer.getVLCVout();
                    vlcOut.setWindowSize(mVideoWidth, mVideoHeight);
                    if (autoAspectRatio) {
                        mMediaPlayer.setAspectRatio(mVideoWidth + ":" + mVideoHeight);
                    }
                }
            }
        }
    };

    /**
     * 播放过程中的时间事件监听
     */
    private MediaPlayer.EventListener mPlayerListener = new MediaPlayer.EventListener() {
        long currentTime = 0;
        long totalLength = 0;

        @Override
        public void onEvent(MediaPlayer.Event event) {
            boolean isPlaying = mMediaPlayer.isPlaying();
            currentTime = mMediaPlayer.getTime();
            float position = mMediaPlayer.getPosition();
            totalLength = mMediaPlayer.getLength();
            WritableMap map = Arguments.createMap();
            map.putBoolean("isPlaying", isPlaying);
            map.putDouble("position", position);
            map.putDouble("currentTime", currentTime);
            map.putDouble("duration", totalLength);

            switch (event.type) {
                case MediaPlayer.Event.EndReached:
                    map.putString("type", "Ended");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_END);
                    break;
                case MediaPlayer.Event.Playing:
                    map.putString("type", "Playing");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_IS_PLAYING);
                    break;
                case MediaPlayer.Event.Opening:
                    map.putString("type", "Opening");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_OPEN);
                    break;
                case MediaPlayer.Event.Paused:
                    map.putString("type", "Paused");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_PAUSED);
                    break;
                case MediaPlayer.Event.Buffering:

                    map.putDouble("bufferRate", event.getBuffering());
                    map.putString("type", "Buffering");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_VIDEO_BUFFERING);
                    break;
                case MediaPlayer.Event.Stopped:
                    map.putString("type", "Stopped");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_VIDEO_STOPPED);
                    break;
                case MediaPlayer.Event.EncounteredError:
                    map.putString("type", "Error");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_ON_ERROR);

                    break;
                case MediaPlayer.Event.TimeChanged:
                    map.putString("type", "TimeChanged");
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_SEEK);
                    break;
                case MediaPlayer.Event.RecordChanged:
                    map.putString("type", "RecordingPath");
                    map.putBoolean("isRecording", event.getRecording());
                    // Record started emits and event with the record path (but no file).
                    // Only want to emit when recording has stopped and the recording is created.
                    if(!event.getRecording() && event.getRecordPath() != null) {
                        map.putString("recordPath", event.getRecordPath());
                    }
                    eventEmitter.sendEvent(map, VideoEventEmitter.EVENT_RECORDING_STATE);
                    break;
                default:
                    map.putString("type", event.type + "");
                    eventEmitter.onVideoStateChange(map);
                    break;
            }

        }
    };

    private IVLCVout.OnNewVideoLayoutListener onNewVideoLayoutListener = new IVLCVout.OnNewVideoLayoutListener() {
        @Override
        public void onNewVideoLayout(IVLCVout vout, int width, int height, int visibleWidth, int visibleHeight, int sarNum, int sarDen) {
            if (width * height == 0)
                return;
            // store video size
            mVideoWidth = width;
            mVideoHeight = height;
            mVideoVisibleWidth = visibleWidth;
            mVideoVisibleHeight = visibleHeight;
            mSarNum = sarNum;
            mSarDen = sarDen;
            WritableMap map = Arguments.createMap();
            map.putInt("mVideoWidth", mVideoWidth);
            map.putInt("mVideoHeight", mVideoHeight);
            map.putInt("mVideoVisibleWidth", mVideoVisibleWidth);
            map.putInt("mVideoVisibleHeight", mVideoVisibleHeight);
            map.putInt("mSarNum", mSarNum);
            map.putInt("mSarDen", mSarDen);
            map.putString("type", "onNewVideoLayout");
            eventEmitter.onVideoStateChange(map);
        }
    };

    IVLCVout.Callback callback = new IVLCVout.Callback() {
        @Override
        public void onSurfacesCreated(IVLCVout ivlcVout) {
            isSurfaceViewDestory = false;
        }

        @Override
        public void onSurfacesDestroyed(IVLCVout ivlcVout) {
            isSurfaceViewDestory = true;
        }

    };


    /*************
     * MediaPlayer
     *************/


    private void stopPlayback() {
        onStopPlayback();
        releasePlayer();
    }

    private void onStopPlayback() {
        setKeepScreenOn(false);
        audioManager.abandonAudioFocus(this);
    }

    private void createPlayer(boolean autoplayResume, boolean isResume) {
        releasePlayer();
        if (this.getSurfaceTexture() == null) {
            return;
        }
        try {
            final ArrayList<String> cOptions = new ArrayList<>();
            String uriString = srcMap.hasKey("uri") ? srcMap.getString("uri") : null;
            //String extension = srcMap.hasKey("type") ? srcMap.getString("type") : null;
            boolean isNetwork = srcMap.hasKey("isNetwork") ? srcMap.getBoolean("isNetwork") : false;
            boolean autoplay = srcMap.hasKey("autoplay") ? srcMap.getBoolean("autoplay") : true;
            int initType = srcMap.hasKey("initType") ? srcMap.getInt("initType") : 1;
            ReadableArray mediaOptions = srcMap.hasKey("mediaOptions") ? srcMap.getArray("mediaOptions") : null;
            ReadableArray initOptions = srcMap.hasKey("initOptions") ? srcMap.getArray("initOptions") : null;
            Integer hwDecoderEnabled = srcMap.hasKey("hwDecoderEnabled") ? srcMap.getInt("hwDecoderEnabled") : null;
            Integer hwDecoderForced = srcMap.hasKey("hwDecoderForced") ? srcMap.getInt("hwDecoderForced") : null;

            if (initOptions != null) {
                ArrayList options = initOptions.toArrayList();
                for (int i = 0; i < options.size() - 1; i++) {
                    String option = (String) options.get(i);
                    cOptions.add(option);
                }
            }
            // Create LibVLC
            if (initType == 1) {
                libvlc = new LibVLC(getContext());
            } else {
                libvlc = new LibVLC(getContext(), cOptions);
            }
            // Create media player
            mMediaPlayer = new MediaPlayer(libvlc);
            setMutedModifier(mMuted);
            mMediaPlayer.setEventListener(mPlayerListener);
            
            // Register dialog callbacks for certificate handling
            Dialog.setCallbacks(libvlc, new Dialog.Callbacks() {
                @Override
                public void onDisplay(Dialog.QuestionDialog dialog) {
                    handleCertificateDialog(dialog);
                }
                
                @Override
                public void onDisplay(Dialog.ErrorMessage dialog) {
                    // Handle error dialogs if needed
                }
                
                @Override
                public void onDisplay(Dialog.LoginDialog dialog) {
                    // Handle login dialogs if needed
                }
                
                @Override
                public void onDisplay(Dialog.ProgressDialog dialog) {
                    // Handle progress dialogs if needed
                }
                
                @Override
                public void onCanceled(Dialog dialog) {
                    // Handle dialog cancellation
                }
                
                @Override
                public void onProgressUpdate(Dialog.ProgressDialog dialog) {
                    // Handle progress updates
                }
            });
            //this.getHolder().setKeepScreenOn(true);
            IVLCVout vlcOut = mMediaPlayer.getVLCVout();
            if (mVideoWidth > 0 && mVideoHeight > 0) {
                vlcOut.setWindowSize(mVideoWidth, mVideoHeight);
                if (autoAspectRatio) {
                    mMediaPlayer.setAspectRatio(mVideoWidth + ":" + mVideoHeight);
                }
                //mMediaPlayer.setAspectRatio(mVideoWidth+":"+mVideoHeight);
            }
            DisplayMetrics dm = getResources().getDisplayMetrics();
            Media m = null;
            if (isNetwork) {
                Uri uri = Uri.parse(uriString);
                m = new Media(libvlc, uri);
            } else {
                m = new Media(libvlc, uriString);
            }
            m.setEventListener(mMediaListener);
            if (hwDecoderEnabled != null && hwDecoderForced != null) {
                boolean hmEnabled = false;
                boolean hmForced = false;
                if (hwDecoderEnabled >= 1) {
                    hmEnabled = true;
                }
                if (hwDecoderForced >= 1) {
                    hmForced = true;
                }
                m.setHWDecoderEnabled(hmEnabled, hmForced);
            }
            //添加media  option
            if (mediaOptions != null) {
                ArrayList options = mediaOptions.toArrayList();
                for (int i = 0; i < options.size() - 1; i++) {
                    String option = (String) options.get(i);
                    m.addOption(option);
                }
            }
            mVideoInfo = null;
            mVideoInfoHash = null;
            mMediaPlayer.setMedia(m);
            m.release();
            mMediaPlayer.setScale(0);
            if (_subtitleUri != null) {
                mMediaPlayer.addSlave(Media.Slave.Type.Subtitle, _subtitleUri, true);
            }

            if (!vlcOut.areViewsAttached()) {
                vlcOut.addCallback(callback);
                // vlcOut.setVideoSurface(this.getSurfaceTexture());
                //vlcOut.setVideoSurface(this.getHolder().getSurface(), this.getHolder());
                //vlcOut.attachViews(onNewVideoLayoutListener);
                vlcOut.setVideoSurface(this.getSurfaceTexture());
                vlcOut.attachViews(onNewVideoLayoutListener);
                // vlcOut.attachSurfaceSlave(surfaceVideo,null,onNewVideoLayoutListener);
                //vlcOut.setVideoView(this);
                //vlcOut.attachViews(onNewVideoLayoutListener);
            }
            if (isResume) {
                if (autoplayResume) {
                    mMediaPlayer.play();
                }
            } else {
                if (autoplay) {
                    isPaused = false;
                    mMediaPlayer.play();
                }
            }
            eventEmitter.loadStart();

            setProgressUpdateRunnable();
        } catch (Exception e) {
            e.printStackTrace();
            //Toast.makeText(getContext(), "Error creating player!", Toast.LENGTH_LONG).show();
        }
    }

    private void releasePlayer() {
        if (libvlc == null)
            return;

        final IVLCVout vout = mMediaPlayer.getVLCVout();
        vout.removeCallback(callback);
        vout.detachViews();
        //surfaceView.removeOnLayoutChangeListener(onLayoutChangeListener);
        mMediaPlayer.release();
        libvlc.release();
        libvlc = null;

        if(mProgressUpdateRunnable != null){
            mProgressUpdateHandler.removeCallbacks(mProgressUpdateRunnable);
        }
    }

    /**
     * 视频进度调整
     *
     * @param position
     */
    public void setPosition(float position) {
        if (mMediaPlayer != null) {
            if (position >= 0 && position <= 1) {
                mMediaPlayer.setPosition(position);
            }
        }
    }

    public void setSubtitleUri(String subtitleUri) {
        _subtitleUri = subtitleUri;
        if (mMediaPlayer != null) {
            mMediaPlayer.addSlave(Media.Slave.Type.Subtitle,  _subtitleUri, true);
        }
    }

    /**
     * 设置资源路径
     *
     * @param uri
     * @param isNetStr
     */
    public void setSrc(String uri, boolean isNetStr, boolean autoplay) {
        this.src = uri;
        this.netStrTag = isNetStr;
        createPlayer(autoplay, false);
    }

    public void setSrc(ReadableMap src) {
        this.srcMap = src;
        createPlayer(true, false);
    }

    /**
     * 改变播放速率
     *
     * @param rateModifier
     */
    public void setRateModifier(float rateModifier) {
        if (mMediaPlayer != null) {
            mMediaPlayer.setRate(rateModifier);
        }
    }

    public void setmProgressUpdateInterval(float interval) {
        mProgressUpdateInterval = interval;
        createPlayer(true, false);
    }


    /**
     * 改变声音大小
     *
     * @param volumeModifier
     */
    public void setVolumeModifier(int volumeModifier) {
        if (mMediaPlayer != null) {
            mMediaPlayer.setVolume(volumeModifier);
        }
    }

    /**
     * 改变静音状态
     *
     * @param muted
     */
    public void setMutedModifier(boolean muted) {
        mMuted = muted;
        if (mMediaPlayer != null) {
            if (muted) {
                this.preVolume = mMediaPlayer.getVolume();
                mMediaPlayer.setVolume(0);
            } else {
                mMediaPlayer.setVolume(this.preVolume);
            }
        }
    }

    /**
     * 改变播放状态
     *
     * @param paused
     */
    public void setPausedModifier(boolean paused) {
        Log.i("paused:", "" + paused + ":" + mMediaPlayer);
        if (mMediaPlayer != null) {
            if (paused) {
                isPaused = true;
                mMediaPlayer.pause();
            } else {
                isPaused = false;
                mMediaPlayer.play();
                Log.i("do play:", true + "");
            }
        } else {
            createPlayer(!paused, false);
        }
    }


    /**
     * Take a screenshot of the current video frame
     *
     * @param path The file path where to save the screenshot
     * @return boolean indicating if the screenshot was taken successfully
     */
    public boolean doSnapshot(String path) {
        if (mMediaPlayer != null) {
            try {
                Bitmap bitmap = getBitmap();
                if (bitmap == null) {
                    WritableMap event = Arguments.createMap();
                    event.putBoolean("success", false);
                    event.putString("error", "Failed to capture bitmap");
                    eventEmitter.sendEvent(event, VideoEventEmitter.EVENT_ON_SNAPSHOT);
                    return false;
                }

                File file = new File(path);
                file.getParentFile().mkdirs();

                FileOutputStream out = new FileOutputStream(file);

                String extension = path.substring(path.lastIndexOf(".") + 1);
                if (extension.equals("png")) {
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
                } else {
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 100, out);
                }
                out.flush();
                out.close();

                bitmap.recycle();

                WritableMap event = Arguments.createMap();
                event.putBoolean("success", true);
                event.putString("path", path);
                eventEmitter.sendEvent(event, VideoEventEmitter.EVENT_ON_SNAPSHOT);
                return true;
            } catch (Exception e) {
                WritableMap event = Arguments.createMap();
                event.putBoolean("success", false);
                event.putString("error", e.getMessage());
                eventEmitter.sendEvent(event, VideoEventEmitter.EVENT_ON_SNAPSHOT);
                e.printStackTrace();
                return false;
            }
        }
        WritableMap event = Arguments.createMap();
        event.putBoolean("success", false);
        event.putString("error", "MediaPlayer is null");
        eventEmitter.sendEvent(event, VideoEventEmitter.EVENT_ON_SNAPSHOT);
        return false;
    }


    /**
     * 重新加载视频
     *
     * @param autoplay
     */
    public void doResume(boolean autoplay) {
        createPlayer(autoplay, true);
    }


    public void setRepeatModifier(boolean repeat) {
    }


    /**
     * 改变宽高比
     *
     * @param aspectRatio
     */
    public void setAspectRatio(String aspectRatio) {
        if (!autoAspectRatio && mMediaPlayer != null) {
            mMediaPlayer.setAspectRatio(aspectRatio);
        }
    }

    public void setAutoAspectRatio(boolean auto) {
        autoAspectRatio = auto;
    }

    public void setAudioTrack(int track) {
        if (mMediaPlayer != null) {
            mMediaPlayer.setAudioTrack(track);
        }
    }

    public void setTextTrack(int track) {
        if (mMediaPlayer != null) {
            mMediaPlayer.setSpuTrack(track);
        }
    }

    public void startRecording(String recordingPath) {
        if(mMediaPlayer == null) return;
        if(recordingPath != null) {
            mMediaPlayer.record(recordingPath);
        }
    }

    public void stopRecording() {
        if(mMediaPlayer == null) return;
        mMediaPlayer.record(null);
    }

    private void handleCertificateDialog(Dialog.QuestionDialog dialog) {
        String title = dialog.getTitle();
        String text = dialog.getText();
        
        Log.i(TAG, "Certificate dialog - Title: " + title + ", Text: " + text);
        
        // Check if it's a certificate validation dialog
        if (text != null && (text.contains("certificate") || text.contains("SSL") || text.contains("TLS") || text.contains("cert"))) {
            if (acceptInvalidCertificates) {
                // Auto-accept invalid certificate
                dialog.postAction(1); // Action 1 typically means "Accept"
                Log.i(TAG, "Auto-accepted certificate dialog");
            } else {
                // Reject invalid certificate (default secure behavior)
                dialog.postAction(2); // Action 2 typically means "Reject"
                Log.i(TAG, "Rejected certificate dialog (acceptInvalidCertificates=false)");
            }
        } else {
            // For non-certificate dialogs, dismiss
            dialog.dismiss();
            Log.i(TAG, "Dismissed non-certificate dialog");
        }
    }
    
    public void setAcceptInvalidCertificates(boolean accept) {
        this.acceptInvalidCertificates = accept;
        Log.i(TAG, "Set acceptInvalidCertificates to: " + accept);
    }

    public void cleanUpResources() {
        if (surfaceView != null) {
            surfaceView.removeOnLayoutChangeListener(onLayoutChangeListener);
        }
        stopPlayback();
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        mVideoWidth = width;
        mVideoHeight = height;
        surfaceVideo = new Surface(surface);
        createPlayer(true, false);
    }

    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {

    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
        return true;
    }

    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surface) {
        // Log.i("onSurfaceTextureUpdated", "onSurfaceTextureUpdated");
    }

    private final Media.EventListener mMediaListener = new Media.EventListener() {
        @Override
        public void onEvent(Media.Event event) {
            switch (event.type) {
                case Media.Event.MetaChanged:
                    Log.i(tag, "Media.Event.MetaChanged:  =" + event.getMetaId());
                    break;
                case Media.Event.ParsedChanged:
                    Log.i(tag, "Media.Event.ParsedChanged  =" + event.getMetaId());

                    break;
                case Media.Event.StateChanged:
                    Log.i(tag, "StateChanged   =" + event.getMetaId());
                    break;
                default:
                    Log.i(tag, "Media.Event.type=" + event.type + "   eventgetParsedStatus=" + event.getParsedStatus());
                    break;

            }
        }
    };

    private void updateVideoInfo() {
        // Create a hash of the video info to compare for changes
        StringBuilder infoHash = new StringBuilder();
        
        infoHash.append("duration:").append(mMediaPlayer.getLength()).append(";");
        
        if(mMediaPlayer.getAudioTracksCount() > 0) {
            MediaPlayer.TrackDescription[] audioTracks = mMediaPlayer.getAudioTracks();
            infoHash.append("audioTracks:");
            for (MediaPlayer.TrackDescription track : audioTracks) {
                infoHash.append(track.id).append(":").append(track.name).append(",");
            }
            infoHash.append(";");
        }

        if(mMediaPlayer.getSpuTracksCount() > 0) {
            MediaPlayer.TrackDescription[] spuTracks = mMediaPlayer.getSpuTracks();
            infoHash.append("textTracks:");
            for (MediaPlayer.TrackDescription track : spuTracks) {
                infoHash.append(track.id).append(":").append(track.name).append(",");
            }
            infoHash.append(";");
        }

        Media.VideoTrack video = mMediaPlayer.getCurrentVideoTrack();
        if(video != null) {
            infoHash.append("videoSize:").append(video.width).append("x").append(video.height).append(";");
        }
        
        String currentHash = infoHash.toString();
        
        // Only send update if info has changed
        if (mVideoInfoHash == null || !mVideoInfoHash.equals(currentHash)) {
            WritableMap info = Arguments.createMap();

            info.putDouble("duration", mMediaPlayer.getLength());

            if(mMediaPlayer.getAudioTracksCount() > 0) {
                MediaPlayer.TrackDescription[] audioTracks = mMediaPlayer.getAudioTracks();
                WritableArray tracks = new WritableNativeArray();
                for (MediaPlayer.TrackDescription track : audioTracks) {
                    WritableMap trackMap = Arguments.createMap();
                    trackMap.putInt("id", track.id);
                    trackMap.putString("name", track.name);
                    tracks.pushMap(trackMap);
                }
                info.putArray("audioTracks", tracks);
            }

            if(mMediaPlayer.getSpuTracksCount() > 0) {
                MediaPlayer.TrackDescription[] spuTracks = mMediaPlayer.getSpuTracks();
                WritableArray tracks = new WritableNativeArray();
                for (MediaPlayer.TrackDescription track : spuTracks) {
                    WritableMap trackMap = Arguments.createMap();
                    trackMap.putInt("id", track.id);
                    trackMap.putString("name", track.name);
                    tracks.pushMap(trackMap);
                }
                info.putArray("textTracks", tracks);
            }

            Media.VideoTrack video2 = mMediaPlayer.getCurrentVideoTrack();
            if(video2 != null) {
                WritableMap mapVideoSize = Arguments.createMap();
                mapVideoSize.putInt("width", video2.width);
                mapVideoSize.putInt("height", video2.height);
                info.putMap("videoSize", mapVideoSize);
            }
            
            eventEmitter.sendEvent(info, VideoEventEmitter.EVENT_ON_LOAD);
            mVideoInfo = info;
            mVideoInfoHash = currentHash;
        }
    }

    /*private void changeSurfaceSize(boolean message) {

        if (mMediaPlayer != null) {
            final IVLCVout vlcVout = mMediaPlayer.getVLCVout();
            vlcVout.setWindowSize(screenWidth, screenHeight);
        }

        double displayWidth = screenWidth, displayHeight = screenHeight;

        if (screenWidth < screenHeight) {
            displayWidth = screenHeight;
            displayHeight = screenWidth;
        }

        // sanity check
        if (displayWidth * displayHeight <= 1 || mVideoWidth * mVideoHeight <= 1) {
            return;
        }

        // compute the aspect ratio
        double aspectRatio, visibleWidth;
        if (mSarDen == mSarNum) {
            *//* No indication about the density, assuming 1:1 *//*
            visibleWidth = mVideoVisibleWidth;
            aspectRatio = (double) mVideoVisibleWidth / (double) mVideoVisibleHeight;
        } else {
            *//* Use the specified aspect ratio *//*
            visibleWidth = mVideoVisibleWidth * (double) mSarNum / mSarDen;
            aspectRatio = visibleWidth / mVideoVisibleHeight;
        }

        // compute the display aspect ratio
        double displayAspectRatio = displayWidth / displayHeight;

        counter ++;

        switch (mCurrentSize) {
            case SURFACE_BEST_FIT:
                if(counter > 2)
                    Toast.makeText(getContext(), "Best Fit", Toast.LENGTH_SHORT).show();
                if (displayAspectRatio < aspectRatio)
                    displayHeight = displayWidth / aspectRatio;
                else
                    displayWidth = displayHeight * aspectRatio;
                break;
            case SURFACE_FIT_HORIZONTAL:
                Toast.makeText(getContext(), "Fit Horizontal", Toast.LENGTH_SHORT).show();
                displayHeight = displayWidth / aspectRatio;
                break;
            case SURFACE_FIT_VERTICAL:
                Toast.makeText(getContext(), "Fit Horizontal", Toast.LENGTH_SHORT).show();
                displayWidth = displayHeight * aspectRatio;
                break;
            case SURFACE_FILL:
                Toast.makeText(getContext(), "Fill", Toast.LENGTH_SHORT).show();
                break;
            case SURFACE_16_9:
                Toast.makeText(getContext(), "16:9", Toast.LENGTH_SHORT).show();
                aspectRatio = 16.0 / 9.0;
                if (displayAspectRatio < aspectRatio)
                    displayHeight = displayWidth / aspectRatio;
                else
                    displayWidth = displayHeight * aspectRatio;
                break;
            case SURFACE_4_3:
                Toast.makeText(getContext(), "4:3", Toast.LENGTH_SHORT).show();
                aspectRatio = 4.0 / 3.0;
                if (displayAspectRatio < aspectRatio)
                    displayHeight = displayWidth / aspectRatio;
                else
                    displayWidth = displayHeight * aspectRatio;
                break;
            case SURFACE_ORIGINAL:
                Toast.makeText(getContext(), "Original", Toast.LENGTH_SHORT).show();
                displayHeight = mVideoVisibleHeight;
                displayWidth = visibleWidth;
                break;
        }

        // set display size
        int finalWidth = (int) Math.ceil(displayWidth * mVideoWidth / mVideoVisibleWidth);
        int finalHeight = (int) Math.ceil(displayHeight * mVideoHeight / mVideoVisibleHeight);

        SurfaceHolder holder = this.getHolder();
        holder.setFixedSize(finalWidth, finalHeight);

        ViewGroup.LayoutParams lp = this.getLayoutParams();
        lp.width = finalWidth;
        lp.height = finalHeight;
        this.setLayoutParams(lp);
        this.invalidate();
    }*/
}
