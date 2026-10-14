/**
 * Created by yuanzhou.xu on 2018/5/15.
 */
import { Component } from 'react';
import {
  StatusBar,
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import VLCPlayerView from './VLCPlayerView';
import type { VLCPlayerViewProps } from './VLCPlayerView';
import { getStatusBarHeight } from './SizeController';

const statusBarHeight = getStatusBarHeight();
const _fullKey = 'commonVideo_android_fullKey';
const deviceHeight = Dimensions.get('window').height;

/**
 * Injected navigation/orientation helpers. Both are supplied by the host app, so
 * they stay structurally typed.
 */
export type BackHandleLike = {
  addBackFunction: (key: string, backFunction: () => void) => void;
  removeBackFunction: (key: string) => void;
};

export type OrientationLike = {
  lockToPortrait?: () => void;
  lockToLandscape?: () => void;
};

export type VlCPlayerViewProps = Omit<VLCPlayerViewProps, 'uri' | 'style'> & {
  /** Media URL to play */
  url?: string;
  /** Pre-roll URL, played before `url` when `showGG` is set */
  ggUrl?: string;
  /** Whether to play the pre-roll */
  showGG?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Overrides the device width used to derive the default aspect ratio */
  widthCamera?: number;
  videoAspectRatio?: string;
  fullVideoAspectRatio?: string;
  /** Called when the pre-roll finishes */
  onGGEnd?: () => void;
  BackHandle?: BackHandleLike;
  Orientation?: OrientationLike;
};

type VlCPlayerViewState = {
  isEndGG: boolean;
  isFull: boolean;
  currentUrl: string;
  storeUrl: string;
  currentVideoAspectRatio?: string;
};

export default class VlCPlayerView extends Component<
  VlCPlayerViewProps,
  VlCPlayerViewState
> {
  private deviceWidth = Dimensions.get('window').width;
  private initialHeight: number = 200;
  private _componentMounted = false;

  constructor(props: VlCPlayerViewProps) {
    super(props);
    if (props.widthCamera) {
      this.deviceWidth = props.widthCamera;
    }
  }

  state: VlCPlayerViewState = {
    isEndGG: false,
    isFull: false,
    currentUrl: '',
    storeUrl: '',
  };

  static getDerivedStateFromProps(
    nextProps: VlCPlayerViewProps,
    preState: VlCPlayerViewState
  ): Partial<VlCPlayerViewState> | null {
    const { url } = nextProps;
    const { storeUrl } = preState;
    if (url && url !== storeUrl) {
      if (storeUrl === '') {
        return { currentUrl: url, storeUrl: url, isEndGG: false };
      }
      return { currentUrl: '', storeUrl: url, isEndGG: false };
    }
    return null;
  }

  componentDidMount() {
    this._componentMounted = true;
    StatusBar.setBarStyle('light-content');

    const { style, isFull } = this.props;
    const flatStyle = StyleSheet.flatten(style);
    if (flatStyle && typeof flatStyle.height === 'number') {
      this.initialHeight = flatStyle.height;
    }
    this.setState({
      currentVideoAspectRatio: `${this.deviceWidth}:${this.initialHeight}`,
    });

    if (isFull) {
      this._toFullScreen();
    }
  }

  componentDidUpdate(
    _prevProps: VlCPlayerViewProps,
    prevState: VlCPlayerViewState
  ) {
    if (this.props.url !== prevState.storeUrl && this._componentMounted) {
      this.setState({
        storeUrl: this.props.url ?? '',
        currentUrl: this.props.url ?? '',
      });
    }
  }

  componentWillUnmount() {
    this._componentMounted = false;
    if (this.props.isFull) {
      this._closeFullScreen();
    }
  }

  _closeFullScreen = () => {
    const { closeFullScreen, BackHandle } = this.props;
    if (this._componentMounted) {
      this.setState({
        isFull: false,
        currentVideoAspectRatio: `${this.deviceWidth}:${this.initialHeight}`,
      });
    }
    BackHandle?.removeBackFunction(_fullKey);
    // NOTE: upstream had `Orientation && Orientation.lockToPortrait;` here — a
    // dangling expression that never called anything. Left uncalled on purpose:
    // actually locking the orientation would be a behaviour change. Phase 4 owns
    // the decision when this control UI is extracted.
    StatusBar.setHidden(false);
    if (this._componentMounted) {
      closeFullScreen?.();
    }
  };

  _toFullScreen = () => {
    const { startFullScreen, BackHandle } = this.props;
    this.setState({
      isFull: true,
      currentVideoAspectRatio: `${deviceHeight}:${this.deviceWidth}`,
    });
    StatusBar.setHidden(true);
    BackHandle?.addBackFunction(_fullKey, this._closeFullScreen);
    startFullScreen?.();
    // See the note in `_closeFullScreen` about `Orientation.lockToLandscape`.
  };

  render() {
    const {
      // Destructured only to keep it out of `rest`; the rendered URL comes from
      // state, which `getDerivedStateFromProps` keeps in sync.
      url: _url,
      ggUrl,
      showGG,
      onGGEnd,
      onEnd,
      onError,
      style,
      title,
      onLeftPress,
      showBack,
      showTitle,
      closeFullScreen,
      videoAspectRatio,
      fullVideoAspectRatio,
      ...rest
    } = this.props;
    const { isEndGG, isFull, currentUrl } = this.state;

    let currentVideoAspectRatio = isFull
      ? fullVideoAspectRatio
      : videoAspectRatio;
    if (!currentVideoAspectRatio) {
      currentVideoAspectRatio = this.state.currentVideoAspectRatio;
    }

    const realShowGG = !!(showGG && ggUrl && !isEndGG);
    const showVideo = !!currentUrl && (!showGG || isEndGG);
    const showTop = !showVideo && !realShowGG;
    const type = extension(currentUrl);
    const ggType = extension(ggUrl);

    return (
      <View style={[isFull ? styles.container : styles.collapsed, style]}>
        {showTop && (
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
                {showTitle && (
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {realShowGG && (
          <VLCPlayerView
            {...rest}
            videoAspectRatio={currentVideoAspectRatio}
            uri={{ uri: ggUrl!, type: ggType }}
            type={ggType}
            isGG
            showBack={showBack}
            showTitle={showTitle}
            isFull={isFull}
            onEnd={() => {
              onGGEnd?.();
              this.setState({ isEndGG: true });
            }}
            startFullScreen={this._toFullScreen}
            closeFullScreen={this._closeFullScreen}
          />
        )}

        {showVideo && (
          <VLCPlayerView
            {...rest}
            uri={{ uri: currentUrl, type }}
            videoAspectRatio={currentVideoAspectRatio}
            onLeftPress={onLeftPress}
            title={title}
            type={type}
            isFull={isFull}
            showBack={showBack}
            showTitle={showTitle}
            style={showGG && !isEndGG ? styles.behindGG : undefined}
            startFullScreen={this._toFullScreen}
            closeFullScreen={this._closeFullScreen}
            onEnd={() => onEnd?.()}
            onError={() => onError?.()}
          />
        )}
      </View>
    );
  }
}

function extension(url?: string): string {
  if (!url) {
    return '';
  }
  const parts = url.split('.');
  return parts.length > 0 ? parts[parts.length - 1]! : '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  collapsed: {
    height: 200,
    backgroundColor: '#000',
  },
  behindGG: {
    position: 'absolute',
    zIndex: -1,
  },
  topView: {
    top: Platform.OS === 'ios' ? statusBarHeight : 0,
    left: 0,
    height: 45,
    position: 'absolute',
    width: '100%',
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
    backgroundColor: 'rgba(0,0,0,0.1)',
    height: 40,
    borderRadius: 20,
    width: 40,
  },
});
