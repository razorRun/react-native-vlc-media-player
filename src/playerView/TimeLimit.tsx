/**
 * Created by yuanzhou.xu on 2018/5/16.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export type TimeLimitProps = {
  /** Countdown length in seconds. A value of 0 disables the timer. */
  maxTime?: number;
  onEnd?: () => void;
};

export default function TimeLimit({ maxTime = 0, onEnd }: TimeLimitProps) {
  const [timeNumber, setTimeNumber] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const handleEnd = useCallback(() => {
    clear();
    onEnd?.();
  }, [clear, onEnd]);

  useEffect(() => {
    if (maxTime <= 0) {
      return undefined;
    }
    timer.current = setInterval(() => {
      setTimeNumber((current) => current + 1);
    }, 1000);
    return clear;
  }, [clear, maxTime]);

  useEffect(() => {
    if (maxTime > 0 && timeNumber >= maxTime) {
      handleEnd();
    }
  }, [handleEnd, maxTime, timeNumber]);

  return (
    <TouchableOpacity style={styles.row} onPress={handleEnd} activeOpacity={1}>
      {maxTime > 0 && (
        <View style={styles.timeView}>
          <Text style={styles.timeText}>{maxTime - timeNumber}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  timeView: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  timeText: {
    color: 'green',
    fontSize: 13,
  },
});
