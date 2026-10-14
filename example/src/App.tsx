import { useCallback, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { documentDirectory } from 'expo-file-system/legacy';
import {
  VLCPlayer,
  VlCPlayerView,
  type OnProgressEventProps,
  type PlaybackMethods,
  type PlayerAspectRatio,
  type VideoInfo,
} from 'react-native-vlc-media-player';

// The Google sample bucket this used to point at answers with HTTP 403 now.
const DEFAULT_URI =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

const ASPECT_RATIOS: PlayerAspectRatio[] = ['16:9', '4:3', '1:1', '9:16'];

/** The native player wants a plain filesystem path, not a `file://` URI. */
const writableDir = (documentDirectory ?? '').replace(/^file:\/\//, '');

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  const player = useRef<PlaybackMethods>(null);

  const [uriInput, setUriInput] = useState(DEFAULT_URI);
  const [uri, setUri] = useState(DEFAULT_URI);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [useControlView, setUseControlView] = useState(false);
  const [aspectIndex, setAspectIndex] = useState(0);
  const [progress, setProgress] = useState<OnProgressEventProps | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [recording, setRecording] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const append = useCallback((line: string) => {
    setLog((entries) => [line, ...entries].slice(0, 40));
  }, []);

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      if (!progress || progress.duration <= 0) {
        append('seek skipped: duration unknown yet');
        return;
      }
      const durationSeconds = progress.duration / 1000;
      const next = Math.min(
        Math.max(
          (progress.currentTime / 1000 + deltaSeconds) / durationSeconds,
          0
        ),
        1
      );
      // seek() takes a fraction of the duration on both platforms.
      player.current?.seek(next);
      append(`seek -> ${next.toFixed(4)}`);
    },
    [append, progress]
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.playerBox}>
        {useControlView ? (
          <VlCPlayerView
            key={`view-${uri}`}
            url={uri}
            showBack={false}
            showTitle
            title="VlCPlayerView"
            style={styles.player}
            onEnd={() => append('VlCPlayerView: onEnd')}
            onError={() => append('VlCPlayerView: onError')}
          />
        ) : (
          <VLCPlayer
            key={`player-${uri}`}
            ref={player}
            style={styles.player}
            source={{ uri }}
            paused={paused}
            muted={muted}
            repeat={repeat}
            videoAspectRatio={ASPECT_RATIOS[aspectIndex]}
            onProgress={setProgress}
            onLoad={(event) => {
              setInfo(event);
              append(
                `onLoad: ${event.videoSize.width}x${event.videoSize.height}, ` +
                  `${event.audioTracks.length} audio / ${event.textTracks.length} text tracks`
              );
            }}
            onPlaying={() => append('onPlaying')}
            onPaused={() => append('onPaused')}
            onStopped={() => append('onStopped')}
            onBuffering={() => append('onBuffering')}
            onEnd={() => append('onEnd')}
            onError={() => append('onError')}
            onRecordingCreated={(path) => {
              setRecording(false);
              append(`onRecordingCreated: ${path}`);
            }}
            onSnapshot={(event) => append(`onSnapshot: ${event.path}`)}
          />
        )}
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
      >
        <Text style={styles.status}>
          {progress
            ? `${formatTime(progress.currentTime / 1000)} / ${formatTime(
                progress.duration / 1000
              )}  ·  ${(progress.position * 100).toFixed(1)}%`
            : 'no progress yet'}
        </Text>
        {info ? (
          <Text style={styles.statusDim}>
            {`${info.videoSize.width}x${info.videoSize.height} · ${formatTime(
              info.duration / 1000
            )}`}
          </Text>
        ) : null}

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={uriInput}
            onChangeText={setUriInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http(s):// or rtsp:// URL"
            placeholderTextColor="#777"
          />
          <Button
            label="Load"
            onPress={() => {
              setProgress(null);
              setInfo(null);
              setUri(uriInput.trim());
              append(`load ${uriInput.trim()}`);
            }}
          />
        </View>

        <View style={styles.row}>
          <Button
            label={paused ? 'Play' : 'Pause'}
            onPress={() => setPaused((value) => !value)}
          />
          <Button label="-10s" onPress={() => seekBy(-10)} />
          <Button label="+10s" onPress={() => seekBy(10)} />
          <Button
            label="Stop"
            onPress={() => {
              player.current?.stopPlayer();
              append('stopPlayer()');
            }}
          />
        </View>

        <View style={styles.row}>
          <Button
            label="resume(true)"
            onPress={() => {
              player.current?.resume(true);
              append('resume(true)');
            }}
          />
          <Button
            label="resume(false)"
            onPress={() => {
              player.current?.resume(false);
              append('resume(false)');
            }}
          />
          <Button
            label="Ratio 16:9"
            onPress={() => {
              player.current?.changeVideoAspectRatio('16:9');
              append("changeVideoAspectRatio('16:9')");
            }}
          />
        </View>

        <View style={styles.row}>
          <Button
            label={`Ratio ${ASPECT_RATIOS[aspectIndex]}`}
            onPress={() =>
              setAspectIndex((index) => (index + 1) % ASPECT_RATIOS.length)
            }
          />
          <Button
            label="Auto ratio"
            onPress={() => {
              player.current?.autoAspectRatio(true);
              append('autoAspectRatio(true)');
            }}
          />
        </View>

        <View style={styles.row}>
          <Button
            label="Snapshot"
            onPress={() => {
              const path = `${writableDir}snapshot-${Date.now()}.png`;
              player.current?.snapshot(path);
              append(`snapshot(${path})`);
            }}
          />
          <Button
            label={recording ? 'Stop rec' : 'Record'}
            onPress={() => {
              if (recording) {
                player.current?.stopRecording();
                append('stopRecording()');
              } else {
                player.current?.startRecording(writableDir);
                setRecording(true);
                append(`startRecording(${writableDir})`);
              }
            }}
          />
        </View>

        <Toggle label="Muted" value={muted} onChange={setMuted} />
        <Toggle label="Repeat" value={repeat} onChange={setRepeat} />
        <Toggle
          label="Use VlCPlayerView (control UI)"
          value={useControlView}
          onChange={setUseControlView}
        />

        <Text style={styles.sectionTitle}>
          {`Events  ·  ${Platform.OS}  ·  arch: ${
            // @ts-expect-error - global flag injected by the RN runtime
            global.nativeFabricUIManager ? 'new' : 'legacy'
          }`}
        </Text>
        {log.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Button({ label, onPress }: { label?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111',
  },
  playerBox: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  player: {
    flex: 1,
  },
  panel: {
    flex: 1,
  },
  panelContent: {
    padding: 12,
    gap: 8,
  },
  status: {
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statusDim: {
    color: '#999',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#555',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: '#ddd',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  logLine: {
    color: '#9ad',
    fontSize: 11,
  },
});
