package com.yuanzhou.vlc.vlcplayer;

import android.annotation.SuppressLint;
import android.content.Context;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Handler;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.uimanager.ThemedReactContext;

import org.videolan.libvlc.IVLCVout;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCUtil;
import org.videolan.vlc.util.VLCInstance;
import org.videolan.vlc.VlcVideoView;
import java.util.ArrayList;

@SuppressLint("ViewConstructor")
class ReactVlcPlayerView extends SurfaceView implements
        LifecycleEventListener,
        AudioManager.OnAudioFocusChangeListener{

    private static final String TAG = "ReactExoplayerView";


    private final VideoEventEmitter eventEmitter;

    private Handler mainHandler;

    private LibVLC libvlc;
    private MediaPlayer mMediaPlayer = null;
    private int mVideoHeight = 0;
    private int mVideoWidth = 0;
    private int mVideoVisibleHeight;
    private int mVideoVisibleWidth;
    private int mSarNum;
    private int mSarDen;


    SurfaceView surfaceView;
    private boolean isSurfaceViewDestory;

    private int counter = 0;

    private static final int SURFACE_BEST_FIT = 0;
    private static final int SURFACE_FIT_HORIZONTAL = 1;
    private static final int SURFACE_FIT_VERTICAL = 2;
    private static final int SURFACE_FILL = 3;
    private static final int SURFACE_16_9 = 4;
    private static final int SURFACE_4_3 = 5;
    private static final int SURFACE_ORIGINAL = 6;
    private int mCurrentSize = SURFACE_BEST_FIT;
    private int screenWidth;
    private int screenHeight;

    private boolean isPaused = true;
    private boolean isHostPaused = false;
    private boolean isBuffering;
    private float rate = 1f;

    //资源路径
    private String src;
    //是否网络资源
    private  boolean netStrTag;

    // Props from React
    private Uri srcUri;
    private String extension;
    private boolean repeat;
    private boolean disableFocus;
    private boolean playInBackground = false;
    // \ End props

    // React
    private final ThemedReactContext themedReactContext;
    private final AudioManager audioManager;

    public ReactVlcPlayerView(ThemedReactContext context) {
        super(context);
        this.eventEmitter = new VideoEventEmitter(context);
        this.themedReactContext = context;
        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        themedReactContext.addLifecycleEventListener(this);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenHeight = dm.heightPixels;
        screenWidth = dm.widthPixels;
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
        Log.i("onHostResume","---------onHostResume------------>");
        if(mMediaPlayer != null && isSurfaceViewDestory && isHostPaused){
            IVLCVout vlcOut =  mMediaPlayer.getVLCVout();
            if(!vlcOut.areViewsAttached()){
                vlcOut.setVideoSurface(this.getHolder().getSurface(), this.getHolder());
                vlcOut.attachViews(onNewVideoLayoutListener);
                isSurfaceViewDestory = false;
                isPaused = false;
                this.getHolder().setKeepScreenOn(true);
                mMediaPlayer.play();
            }
        }
    }


    @Override
    public void onHostPause() {
        if(!isPaused && mMediaPlayer != null){
            isPaused = true;
            isHostPaused = true;
            mMediaPlayer.pause();
            this.getHolder().setKeepScreenOn(false);
            eventEmitter.paused(true);
        }
        Log.i("onHostPause","---------onHostPause------------>");
    }



    @Override
    public void onHostDestroy() {
        stopPlayback();
    }

    public void cleanUpResources() {
        stopPlayback();
    }

    private void releasePlayer() {
        if (libvlc == null)
            return;
        mMediaPlayer.stop();
        final IVLCVout vout = mMediaPlayer.getVLCVout();
        vout.removeCallback(callback);
        vout.detachViews();
        surfaceView.removeOnLayoutChangeListener(onLayoutChangeListener);
        libvlc.release();
        libvlc = null;
        //mVideoWidth = 0;
        //mVideoHeight = 0;
    }

    private void stopPlayback() {
        onStopPlayback();
        releasePlayer();
    }

    private void onStopPlayback() {
        setKeepScreenOn(false);
        audioManager.abandonAudioFocus(this);
    }

    // AudioManager.OnAudioFocusChangeListener implementation

    @Override
    public void onAudioFocusChange(int focusChange) {
    }

    public void setPlayInBackground(boolean playInBackground) {
        this.playInBackground = playInBackground;
    }

    public void setDisableFocus(boolean disableFocus) {
        this.disableFocus = disableFocus;
    }

    private void createPlayer(boolean autoplay) {
        releasePlayer();
        try {
            // Create LibVLC
            // ArrayList<String> options = new ArrayList<String>(50);
            // [bavv add start]
            // options.add("--rtsp-tcp");
            // options.add("-vv");
            // [bavv add end]
            libvlc =  VLCInstance.get(getContext());
            // libvlc = new LibVLC(getContext(), options);

            // Create media player
            mMediaPlayer = new MediaPlayer(libvlc);
            mMediaPlayer.setEventListener(mPlayerListener);
            surfaceView = this;
            surfaceView.addOnLayoutChangeListener(onLayoutChangeListener);
            this.getHolder().setKeepScreenOn(true);
            IVLCVout vlcOut =  mMediaPlayer.getVLCVout();
            if(mVideoWidth > 0 && mVideoHeight > 0){
                vlcOut.setWindowSize(mVideoWidth,mVideoHeight);
            }
            if (!vlcOut.areViewsAttached()) {
                vlcOut.addCallback(callback);
                vlcOut.setVideoView(surfaceView);
                //vlcOut.setVideoSurface(this.getHolder().getSurface(), this.getHolder());
                vlcOut.attachViews(onNewVideoLayoutListener);
            }
            DisplayMetrics dm = getResources().getDisplayMetrics();
            Media m = null;
            if(netStrTag){
                Uri uri = Uri.parse(this.src);
                m = new Media(libvlc, uri);
            }else{
                m = new Media(libvlc, this.src);
            }
            m.setHWDecoderEnabled(false, false);
            m.addOption(":rtsp-tcp");

            mMediaPlayer.setMedia(m);
            mMediaPlayer.setScale(0);
            // if(autoplay){
                isPaused = false;
                mMediaPlayer.play();
            // }
            eventEmitter.loadStart();
        } catch (Exception e) {
            //Toast.makeText(getContext(), "Error creating player!", Toast.LENGTH_LONG).show();
        }
    }


    /*************
     * Events
     *************/

    private View.OnLayoutChangeListener onLayoutChangeListener = new View.OnLayoutChangeListener(){

        @Override
        public void onLayoutChange(View view, int i, int i1, int i2, int i3, int i4, int i5, int i6, int i7) {
            mVideoWidth = view.getWidth(); // 获取宽度
            mVideoHeight = view.getHeight(); // 获取高度
            IVLCVout vlcOut =  mMediaPlayer.getVLCVout();
            vlcOut.setWindowSize(mVideoWidth,mVideoHeight);
        }
    };

    /**
     * 播放过程中的时间事件监听
     */
    private MediaPlayer.EventListener mPlayerListener = new MediaPlayer.EventListener(){
        long currentTime = 0;
        long totalLength = 0;
        @Override
        public void onEvent(MediaPlayer.Event event) {
            switch (event.type) {
                case MediaPlayer.Event.EndReached:
                    eventEmitter.end();
                    break;
                case MediaPlayer.Event.Playing:
                    eventEmitter.playing();
                    Log.i("Event.playing","Event.playing");
                    break;
                case MediaPlayer.Event.Opening:
                    Log.i("Event.Opening","Event.Opening");
                    eventEmitter.onOpen();
                    break;
                case MediaPlayer.Event.Paused:
                    eventEmitter.paused(true);
                    Log.i("Event.Paused","Event.Paused");
                    break;
                case MediaPlayer.Event.Buffering:
                    if(event.getBuffering()  >= 100){
                        eventEmitter.buffering(false, event.getBuffering());
                    }else{
                        eventEmitter.buffering(true,event.getBuffering());
                    }
                    break;
                case MediaPlayer.Event.Stopped:
                    eventEmitter.stopped();
                    break;
                case MediaPlayer.Event.EncounteredError:
                    break;
                case MediaPlayer.Event.TimeChanged:
                    //event.
                    currentTime = mMediaPlayer.getTime();
                    totalLength = mMediaPlayer.getLength();
                    eventEmitter.progressChanged(currentTime, totalLength);
                    break;
                default:
                    break;
            }
        }
    };


    private IVLCVout.OnNewVideoLayoutListener onNewVideoLayoutListener = new IVLCVout.OnNewVideoLayoutListener(){
        @Override
        public void onNewVideoLayout(IVLCVout vout, int width, int height, int visibleWidth, int visibleHeight, int sarNum, int sarDen) {
            if (width * height == 0)
                return;

            // store video size
            mVideoWidth = width;
            mVideoHeight = height;
            mVideoVisibleWidth  = visibleWidth;
            mVideoVisibleHeight = visibleHeight;
            mSarNum = sarNum;
            mSarDen = sarDen;
            Log.i("onNewVideoLayout","{" +
                    "mVideoWidth:"+mVideoWidth+",mVideoHeight:"+mVideoHeight +
                    "mVideoVisibleWidth:"+mVideoVisibleWidth+",mVideoVisibleHeight:"+mVideoVisibleHeight);
            eventEmitter.load(mMediaPlayer.getLength(),mMediaPlayer.getTime(),mVideoVisibleWidth,mVideoVisibleHeight);
        }
    };


    IVLCVout.Callback callback = new IVLCVout.Callback() {
        @Override
        public void onSurfacesCreated(IVLCVout ivlcVout) {
            isSurfaceViewDestory = false;
        }

        @Override
        public void onSurfacesDestroyed(IVLCVout ivlcVout) {
            //IVLCVout vlcOut =  mMediaPlayer.getVLCVout();
            //vlcOut.detachViews();
            isSurfaceViewDestory = true;
        }

    };


    public void seekTo(long time) {
        if(mMediaPlayer != null){
            mMediaPlayer.setTime(time);
            mMediaPlayer.isSeekable();
        }
    }

    public void setSrc(String uri, boolean isNetStr) {
        this.src = uri;
        this.netStrTag = isNetStr;
        createPlayer(false);
    }

    public void setRateModifier(float rateModifier) {
        if(mMediaPlayer != null){
            mMediaPlayer.setRate(rateModifier);
        }
    }


    public void setVolumeModifier(int volumeModifier) {
        if(mMediaPlayer != null){
            mMediaPlayer.setVolume(volumeModifier);
        }
    }

    public void setPausedModifier(boolean paused){
        if(mMediaPlayer != null){
            if(paused){
                isPaused = true;
                mMediaPlayer.pause();
            }else{
                isPaused = false;
                mMediaPlayer.play();
            }
        }
    }

    public void doResume(boolean autoplay){
        createPlayer(autoplay);
    }

    public void setRepeatModifier(boolean repeat){
    }

    public void setAspectRatio(String aspectRatio){
        if(mMediaPlayer != null){
            mMediaPlayer.setAspectRatio(aspectRatio);
        }
    }


    private void changeSurfaceSize(boolean message) {

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
            /* No indication about the density, assuming 1:1 */
            visibleWidth = mVideoVisibleWidth;
            aspectRatio = (double) mVideoVisibleWidth / (double) mVideoVisibleHeight;
        } else {
            /* Use the specified aspect ratio */
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
    }
}
