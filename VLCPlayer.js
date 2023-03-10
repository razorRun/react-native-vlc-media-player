import React from "react";
import ReactNative from "react-native";

const { Component } = React;

import PropTypes from "prop-types";

const { StyleSheet, requireNativeComponent, NativeModules, View } = ReactNative;
import resolveAssetSource from "react-native/Libraries/Image/resolveAssetSource";

export default class VLCPlayer extends Component {
  constructor(props, context) {
    super(props, context);
    this.seek = this.seek.bind(this);
    this.resume = this.resume.bind(this);
    this.snapshot = this.snapshot.bind(this);
    this._assignRoot = this._assignRoot.bind(this);
    this._onError = this._onError.bind(this);
    this._onProgress = this._onProgress.bind(this);
    this._onEnded = this._onEnded.bind(this);
    this._onPlaying = this._onPlaying.bind(this);
    this._onStopped = this._onStopped.bind(this);
    this._onPaused = this._onPaused.bind(this);
    this._onBuffering = this._onBuffering.bind(this);
    this._onOpen = this._onOpen.bind(this);
    this._onLoadStart = this._onLoadStart.bind(this);
    this._onLoad = this._onLoad.bind(this);
    this.changeVideoAspectRatio = this.changeVideoAspectRatio.bind(this);
  }
  static defaultProps = {
    autoplay: true,
  };

  setNativeProps(nativeProps) {
    this._root.setNativeProps(nativeProps);
  }

  seek(pos) {
    this.setNativeProps({ seek: pos });
  }

  resume(isResume) {
    this.setNativeProps({ resume: isResume });
  }

  snapshot(path) {
    this.setNativeProps({ snapshotPath: path });
  }

  autoAspectRatio(isAuto) {
    this.setNativeProps({ autoAspectRatio: isAuto });
  }

  changeVideoAspectRatio(ratio) {
    this.setNativeProps({ videoAspectRatio: ratio });
  }

  _assignRoot(component) {
    this._root = component;
  }

  _onBuffering(event) {
    if (this.props.onBuffering) {
      this.props.onBuffering(event.nativeEvent);
    }
  }

  _onError(event) {
    if (this.props.onError) {
      this.props.onError(event.nativeEvent);
    }
  }

  _onOpen(event) {
    if (this.props.onOpen) {
      this.props.onOpen(event.nativeEvent);
    }
  }

  _onLoadStart(event) {
    if (this.props.onLoadStart) {
      this.props.onLoadStart(event.nativeEvent);
    }
  }

  _onProgress(event) {
    if (this.props.onProgress) {
      this.props.onProgress(event.nativeEvent);
    }
  }

  _onEnded(event) {
    if (this.props.onEnd) {
      this.props.onEnd(event.nativeEvent);
    }
  }

  _onStopped() {
    this.setNativeProps({ paused: true });
    if (this.props.onStopped) {
      this.props.onStopped();
    }
  }

  _onPaused(event) {
    if (this.props.onPaused) {
      this.props.onPaused(event.nativeEvent);
    }
  }

  _onPlaying(event) {
    if (this.props.onPlaying) {
      this.props.onPlaying(event.nativeEvent);
    }
  }

  _onLoad(event) {
    if (this.props.onLoad) {
      this.props.onLoad(event.nativeEvent);
    }
  }

  render() {
    /* const {
     source
     } = this.props;*/
    const source = resolveAssetSource(this.props.source) || {};

    let uri = source.uri || "";
    if (uri && uri.match(/^\//)) {
      uri = `file://${uri}`;
    }

    let isNetwork = !!(uri && uri.match(/^https?:/));
    const isAsset = !!(
      uri && uri.match(/^(assets-library|file|content|ms-appx|ms-appdata):/)
    );
    if (!isAsset) {
      isNetwork = true;
    }
    if (uri && uri.match(/^\//)) {
      isNetwork = false;
    }
    source.isNetwork = isNetwork;
    source.autoplay = this.props.autoplay;
    source.initOptions = source.initOptions || [];
    //repeat the input media
    source.initOptions.push("--input-repeat=1000");
    const nativeProps = Object.assign({}, this.props);
    Object.assign(nativeProps, {
      style: [styles.base, nativeProps.style],
      source: source,
      src: {
        uri,
        isNetwork,
        isAsset,
        type: source.type || "",
        mainVer: source.mainVer || 0,
        patchVer: source.patchVer || 0,
      },
      onVideoLoadStart: this._onLoadStart,
      onVideoOpen: this._onOpen,
      onVideoError: this._onError,
      onVideoProgress: this._onProgress,
      onVideoEnded: this._onEnded,
      onVideoEnd: this._onEnded,
      onVideoPlaying: this._onPlaying,
      onVideoPaused: this._onPaused,
      onVideoStopped: this._onStopped,
      onVideoBuffering: this._onBuffering,
      onVideoLoad: this._onLoad,
      progressUpdateInterval: 250,
    });
    return <RCTVLCPlayer ref={this._assignRoot} {...nativeProps} />;
  }
}

VLCPlayer.propTypes = {
  /* Native only */
  rate: PropTypes.number,
  seek: PropTypes.number,
  resume: PropTypes.bool,
  snapshotPath: PropTypes.string,
  paused: PropTypes.bool,

  autoAspectRatio: PropTypes.bool,
  videoAspectRatio: PropTypes.string,
  volume: PropTypes.number,
  disableFocus: PropTypes.bool,
  src: PropTypes.string,
  playInBackground: PropTypes.bool,
  playWhenInactive: PropTypes.bool,
  resizeMode: PropTypes.string,
  poster: PropTypes.string,
  repeat: PropTypes.bool,
  muted: PropTypes.bool,
  audioTrack: PropTypes.number,
  textTrack: PropTypes.number,

  onVideoLoadStart: PropTypes.func,
  onVideoError: PropTypes.func,
  onVideoProgress: PropTypes.func,
  onVideoEnded: PropTypes.func,
  onVideoPlaying: PropTypes.func,
  onVideoPaused: PropTypes.func,
  onVideoStopped: PropTypes.func,
  onVideoBuffering: PropTypes.func,
  onVideoOpen: PropTypes.func,
  onVideoLoad: PropTypes.func,

  /* Wrapper component */
  source: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  subtitleUri: PropTypes.string,

  onError: PropTypes.func,
  onProgress: PropTypes.func,
  onEnded: PropTypes.func,
  onStopped: PropTypes.func,
  onPlaying: PropTypes.func,
  onPaused: PropTypes.func,

  /* Required by react-native */
  scaleX: PropTypes.number,
  scaleY: PropTypes.number,
  translateX: PropTypes.number,
  translateY: PropTypes.number,
  rotation: PropTypes.number,
  ...View.propTypes,
};

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
const RCTVLCPlayer = requireNativeComponent("RCTVLCPlayer", VLCPlayer);
