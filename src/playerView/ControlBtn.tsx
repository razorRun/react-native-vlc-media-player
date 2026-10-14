/**
 * Created by yuanzhou.xu on 2018/5/16.
 */
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type ControlBtnProps = {
  paused?: boolean;
  isFull?: boolean;
  showGoLive?: boolean;
  titleGolive?: string;
  showLeftButton?: boolean;
  showMiddleButton?: boolean;
  showRightButton?: boolean;
  onPausedPress?: (paused: boolean) => void;
  onFullPress?: (isFull: boolean) => void;
  onGoLivePress?: () => void;
  onReplayPress?: () => void;
  style?: StyleProp<ViewStyle>;

  /**
   * Accepted but not rendered. The seek bar and the time labels are commented out
   * upstream and `react-native-slider` is no longer a dependency; Phase 4 decides
   * whether the control UI comes back with `@react-native-community/slider`.
   */
  showSlider?: boolean;
  showGG?: boolean;
  title?: string;
  currentTime?: number;
  totalTime?: number;
  onEnd?: () => void;
  onLeftPress?: () => void;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
};

export default function ControlBtn({
  paused,
  isFull,
  showGoLive,
  titleGolive = 'Go live',
  showLeftButton = true,
  showMiddleButton = true,
  showRightButton = true,
  onPausedPress,
  onFullPress,
  onGoLivePress,
  onReplayPress,
  style,
}: ControlBtnProps) {
  return (
    <View style={[styles.controls, style]}>
      <View style={styles.controlContainer}>
        <TouchableOpacity style={styles.controlContent} activeOpacity={1}>
          <View style={styles.controlContent2}>
            <View style={styles.right}>
              {showLeftButton ? (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => onReplayPress?.()}
                  style={styles.iconBtn}
                >
                  <Icon name="replay" size={30} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconBtnPlaceholder} />
              )}
              <Text style={styles.label}>{'       '}</Text>
            </View>

            {showMiddleButton && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => onPausedPress?.(!paused)}
                style={styles.iconBtn}
              >
                <Icon name={paused ? 'play' : 'pause'} size={30} color="#fff" />
              </TouchableOpacity>
            )}

            <View style={styles.right}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => onGoLivePress?.()}
              >
                <Text style={styles.label}>
                  {showGoLive ? titleGolive : '       '}
                </Text>
              </TouchableOpacity>
              {showRightButton ? (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => onFullPress?.(!isFull)}
                  style={styles.iconBtn}
                >
                  <Icon
                    name={isFull ? 'fullscreen-exit' : 'fullscreen'}
                    size={30}
                    color="#fff"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconBtnPlaceholder} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    width: '100%',
    height: 50,
  },
  controlContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlContent: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  controlContent2: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: {
    width: 50,
  },
  label: {
    fontSize: 11,
    color: '#fff',
  },
});
