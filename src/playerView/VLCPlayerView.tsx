/**
 * Created by yuanzhou.xu on 2018/5/14.
 */
import { Component, createRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import VLCPlayer from '../VLCPlayer';
import type {
  OnProgressEventProps,
  PlaybackMethods,
  SimpleCallbackEventProps,
  VLCPlayerSource,
} from '../types';
import TimeLimit from './TimeLimit';
import ControlBtn from './ControlBtn';
import { getStatusBarHeight } from './SizeController';

const statusBarHeight = getStatusBarHeight();

export type VLCPlayerViewProps = {
  uri?: string | VLCPlayerSource;
  type?: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
  videoAspectRatio?: string;
  initPaused?: boolean;
  isGG?: boolean;
  isFull?: boolean;
  autoplay?: boolean;
  errorTitle?: string;
  showBack?: boolean;
  showTitle?: boolean;
  showGoLive?: boolean;
  titleGolive?: string;
  showLeftButton?: boolean;
  showMiddleButton?: boolean;
  showRightButton?: boolean;
  onEnd?: () => void;
  onError?: () => void;
  onVLCError?: () => void;
  onVLCEnded?: () => void;
  onLeftPress?: () => void;
  onGoLivePress?: () => void;
  onReplayPress?: () => void;
  startFullScreen?: () => void;
  closeFullScreen?: () => void;
};

type VLCPlayerViewState = {
  paused: boolean;
  isLoading: boolean;
  loadingSuccess: boolean;
  currentTime: number;
  totalTime: number;
  showControls: boolean;
  progress?: number;
  isError: boolean;
};

export default class VLCPlayerView extends Component<
  VLCPlayerViewProps,
  VLCPlayerViewState
> {
  private vlcPlayer = createRef<PlaybackMethods>();
  private touchTime = 0;
  private isEnding = false;
  private reloadSuccess = false;
  private changingSlider = false;
  private bufferTime = 0;
  private bufferInterval: ReturnType<typeof setInterval> | null = null;

  state: VLCPlayerViewState = {
    paused: true,
    isLoading: true,
    loadingSuccess: false,
    currentTime: 0.0,
    totalTime: 0.0,
    showControls: false,
    isError: false,
  };

  componentDidMount() {
    if (this.props.isFull) {
      this.setState({ showControls: true });
    }
  }

  componentWillUnmount() {
    // Was `this.vlcPlayer._onStopped()`, which also fired the `onStopped` prop —
    // i.e. `onEnded` — while the component was unmounting. Pausing the native view
    // is the part that actually mattered here.
    this.vlcPlayer.current?.setNativeProps({ paused: true });

    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
  }

  /** 视屏播放 */
  onPlaying = () => {
    this.isEnding = false;
  };

  /** 视屏停止 */
  onPaused = () => {};

  /** 视屏缓冲 */
  onBuffering = () => {
    this.setState({ isLoading: true, isError: false });
    this.bufferTime = new Date().getTime();
    if (!this.bufferInterval) {
      this.bufferInterval = setInterval(this.bufferIntervalFunction, 250);
    }
  };

  bufferIntervalFunction = () => {
    const diffTime = new Date().getTime() - this.bufferTime;
    if (diffTime > 1000) {
      if (this.bufferInterval) {
        clearInterval(this.bufferInterval);
        this.bufferInterval = null;
      }
      this.setState({ paused: true }, () => {
        this.setState({ paused: false, isLoading: false });
      });
    }
  };

  _onError = () => {
    const { onVLCError, onError } = this.props;
    onVLCError?.();
    this.reloadSuccess = false;
    this.setState({ isError: true });
    onError?.();
  };

  _onOpen = () => {};

  _onLoadStart = () => {
    const { isError, currentTime, totalTime } = this.state;
    if (isError) {
      this.reloadSuccess = true;
      this.seekTo(currentTime, totalTime);
      this.setState({ paused: true, isError: false }, () => {
        this.setState({ paused: false });
      });
    } else {
      this.vlcPlayer.current?.seek(0);
      this.setState(
        {
          isLoading: true,
          isError: false,
          loadingSuccess: false,
          paused: true,
          currentTime: 0.0,
          totalTime: 0.0,
        },
        () => {
          this.setState({ paused: false });
        }
      );
    }
  };

  /** iOS seeks by fraction of the duration, Android by absolute seconds. */
  private seekTo(currentTime: number, totalTime: number) {
    const player = this.vlcPlayer.current;
    if (!player) {
      return;
    }
    if (Platform.OS === 'ios') {
      player.seek(
        totalTime > 0 ? Number((currentTime / totalTime).toFixed(17)) : 0
      );
    } else {
      player.seek(currentTime);
    }
  }

  _reload = () => {
    if (!this.reloadSuccess) {
      this.vlcPlayer.current?.resume(false);
    }
  };

  /** 视屏进度变化 */
  onProgress = (event: OnProgressEventProps) => {
    const currentTime = event.currentTime;
    const loadingSuccess = currentTime > 0 || this.state.currentTime > 0;
    if (this.changingSlider) {
      return;
    }
    if (currentTime === 0 || currentTime === this.state.currentTime * 1000) {
      return;
    }
    this.setState({
      loadingSuccess,
      isLoading: false,
      isError: false,
      progress: event.position,
      currentTime: event.currentTime / 1000,
      totalTime: event.duration / 1000,
    });
  };

  /** 视屏播放结束 */
  onEnded = (_event?: SimpleCallbackEventProps) => {
    const { currentTime, totalTime } = this.state;
    const { onVLCEnded, onEnd, isGG } = this.props;
    onVLCEnded?.();
    if (!((currentTime + 5 >= totalTime && totalTime > 0) || isGG)) {
      return;
    }
    this.setState({ paused: true }, () => {
      if (this.isEnding) {
        return;
      }
      onEnd?.();
      if (!isGG) {
        this.vlcPlayer.current?.resume(false);
      }
      this.isEnding = true;
    });
  };

  /** 全屏 */
  _toFullScreen = () => {
    const { startFullScreen, closeFullScreen, isFull } = this.props;
    if (isFull) {
      closeFullScreen?.();
    } else {
      startFullScreen?.();
    }
  };

  /** 播放/停止 */
  _play = () => {
    this.setState((state) => ({ paused: !state.paused }));
  };

  private toggleControls = () => {
    const now = new Date().getTime();
    if (this.touchTime === 0 || now - this.touchTime >= 500) {
      this.touchTime = now;
      this.setState((state) => ({ showControls: !state.showControls }));
    }
  };

  render() {
    const {
      onEnd,
      style,
      isGG,
      type,
      isFull,
      uri,
      title,
      onLeftPress,
      closeFullScreen,
      showBack,
      showTitle,
      videoAspectRatio,
      showGoLive,
      onGoLivePress,
      onReplayPress,
      titleGolive,
      showLeftButton,
      showMiddleButton,
      showRightButton,
      errorTitle = 'error',
    } = this.props;
    const { isLoading, loadingSuccess, showControls, isError } = this.state;

    let source: VLCPlayerSource = { uri: '' };
    if (uri) {
      source = typeof uri === 'string' ? { uri } : uri;
    }

    let showGG = false;
    let realShowLoading = false;
    if (Platform.OS === 'ios') {
      if ((loadingSuccess && isGG) || (isGG && type === 'swf')) {
        showGG = true;
      }
      if (isLoading && type !== 'swf') {
        realShowLoading = true;
      }
    } else {
      if (loadingSuccess && isGG) {
        showGG = true;
      }
      if (isLoading) {
        realShowLoading = true;
      }
    }

    return (
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.videoBtn, style]}
        onPressOut={this.toggleControls}
      >
        <VLCPlayer
          ref={this.vlcPlayer}
          paused={this.state.paused}
          style={styles.video}
          source={source}
          videoAspectRatio={videoAspectRatio}
          onProgress={this.onProgress}
          onEnd={this.onEnded}
          onStopped={this.onEnded}
          onPlaying={this.onPlaying}
          onBuffering={this.onBuffering}
          onPaused={this.onPaused}
          onError={this._onError}
          onOpen={this._onOpen}
          onLoadStart={this._onLoadStart}
        />
        {realShowLoading && !isError && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" animating color="#fff" />
          </View>
        )}
        {isError && (
          <View style={[styles.loading, styles.errorOverlay]}>
            <Text style={styles.errorText}>{errorTitle}</Text>
            <TouchableOpacity
              activeOpacity={1}
              onPress={this._reload}
              style={styles.reloadBtn}
            >
              <Icon name="reload" size={45} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.topView}>
          <View style={styles.backBtn}>
            {showBack && (
              <TouchableOpacity
                onPress={() => {
                  if (isFull) {
                    closeFullScreen?.();
                  } else {
                    onLeftPress?.();
                  }
                }}
                style={styles.btn}
                activeOpacity={0.8}
              >
                <Icon name="chevron-left" size={30} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={styles.titleWrapper}>
              {showTitle && showControls && (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              )}
            </View>
            {showGG && (
              <View style={styles.GG}>
                <TimeLimit onEnd={() => onEnd?.()} />
              </View>
            )}
          </View>
        </View>
        <View style={styles.bottomView}>
          {showControls && (
            <ControlBtn
              showSlider={!isGG}
              showGG={showGG}
              onEnd={onEnd}
              title={title}
              onLeftPress={onLeftPress}
              paused={this.state.paused}
              isFull={isFull}
              currentTime={this.state.currentTime}
              totalTime={this.state.totalTime}
              onPausedPress={this._play}
              onFullPress={this._toFullScreen}
              onValueChange={(value) => {
                this.changingSlider = true;
                this.setState({ currentTime: value });
              }}
              onSlidingComplete={(value) => {
                this.changingSlider = false;
                this.seekTo(value, this.state.totalTime);
              }}
              showGoLive={showGoLive}
              onGoLivePress={onGoLivePress}
              onReplayPress={onReplayPress}
              titleGolive={titleGolive}
              showLeftButton={showLeftButton}
              showMiddleButton={showMiddleButton}
              showRightButton={showRightButton}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  videoBtn: {
    flex: 1,
  },
  video: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  loading: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    backgroundColor: '#000',
  },
  errorText: {
    color: 'red',
  },
  reloadBtn: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  GG: {
    backgroundColor: 'rgba(255,255,255,1)',
    height: 30,
    marginRight: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topView: {
    top: Platform.OS === 'ios' ? statusBarHeight : 0,
    left: 0,
    height: 45,
    position: 'absolute',
    width: '100%',
  },
  bottomView: {
    bottom: 0,
    left: 0,
    height: 50,
    position: 'absolute',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  backBtn: {
    height: 45,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrapper: {
    justifyContent: 'center',
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
  },
  btn: {
    marginLeft: 10,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    height: 40,
    borderRadius: 20,
    width: 40,
    paddingTop: 3,
  },
});
