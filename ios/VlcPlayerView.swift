import AVFoundation
import AVKit
import CoreMedia
import Foundation
import UIKit

#if os(tvOS)
  import TVVLCKit
#else
  import MobileVLCKit
#endif

/// The VLC player core.
///
/// Knows nothing about React Native: events are plain Foundation closures and the
/// payloads are `NSDictionary`. The architecture adapters
/// (`RCTVLCPlayerManager` for the Legacy Architecture, `VlcPlayerComponentView`
/// for Fabric) are the only files that know React exists.
///
/// The payloads deliberately carry no `target` field. React Native injects it on
/// the legacy path (`RCTComponentEvent` sets `body["target"] = viewTag`), and the
/// Fabric adapter fills it from the component view's tag.
@objc(VlcPlayerView)
public class VlcPlayerView: UIView {
  // MARK: - Events

  @objc public var onVideoLoadStart: ((NSDictionary) -> Void)?
  @objc public var onVideoOpen: ((NSDictionary) -> Void)?
  @objc public var onVideoLoad: ((NSDictionary) -> Void)?
  @objc public var onVideoProgress: ((NSDictionary) -> Void)?
  @objc public var onVideoPlaying: ((NSDictionary) -> Void)?
  @objc public var onVideoPaused: ((NSDictionary) -> Void)?
  @objc public var onVideoStopped: ((NSDictionary) -> Void)?
  @objc public var onVideoBuffering: ((NSDictionary) -> Void)?
  @objc public var onVideoError: ((NSDictionary) -> Void)?
  @objc public var onVideoEnded: ((NSDictionary) -> Void)?
  @objc public var onRecordingState: ((NSDictionary) -> Void)?
  @objc public var onSnapshot: ((NSDictionary) -> Void)?

  // MARK: - State

  private var player: VLCMediaPlayer?
  private var delegateProxy: VlcPlayerDelegateProxy?
  private var dialogProvider: VLCDialogProvider?
  private var videoInfo: NSDictionary?
  private var resolvedSubtitleUri: URL?
  private var isPaused = false

  #if os(tvOS)
    /// The display manager this player last set criteria on, so release can reset
    /// them even when the view has already left its window.
    private var displayManager: AVDisplayManager?
    private var displayCriteriaApplied = false
  #endif

  // MARK: - Props
  //
  // Declared as properties rather than setter-only methods so that both the
  // getter and `set<Name>:` exist. RCTComponentData reads the getter once to
  // capture the value it resets a prop to when JS sends null.

  @objc public var source: NSDictionary? {
    didSet { applySource() }
  }

  @objc public var autoplay: Bool = true {
    didSet {
      if autoplay {
        play()
      }
    }
  }

  @objc public var paused: Bool {
    get { isPaused }
    set {
      isPaused = newValue
      if newValue {
        pause()
      } else {
        play()
      }
    }
  }

  @objc public var resume: Bool = true {
    didSet {
      if resume {
        play()
      } else {
        pause()
      }
    }
  }

  @objc public var subtitleUri: NSString? {
    didSet { applySubtitleUri() }
  }

  @objc public var seek: Float = 0 {
    didSet { applySeek(seek) }
  }

  @objc public var snapshotPath: NSString? {
    didSet {
      if let path = snapshotPath as String? {
        player?.saveVideoSnapshot(at: path, withWidth: 0, andHeight: 0)
      }
    }
  }

  @objc public var rate: Float = 1 {
    didSet { player?.rate = rate }
  }

  @objc public var audioTrack: Int32 = 0 {
    didSet { player?.currentAudioTrackIndex = audioTrack }
  }

  @objc public var textTrack: Int32 = 0 {
    didSet { player?.currentVideoSubTitleIndex = textTrack }
  }

  @objc public var videoAspectRatio: NSString? {
    didSet { applyVideoAspectRatio() }
  }

  @objc public var muted: Bool = false {
    didSet { player?.audio?.isMuted = muted }
  }

  @objc public var acceptInvalidCertificates: Bool = false

  // MARK: - Lifecycle

  @objc public override init(frame: CGRect) {
    super.init(frame: frame)
    addApplicationObservers()
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  private func addApplicationObservers() {
    let center = NotificationCenter.default
    center.addObserver(
      self,
      selector: #selector(applicationWillResignActive),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(applicationWillEnterForeground),
      name: UIApplication.willEnterForegroundNotification,
      object: nil
    )
  }

  @objc private func applicationWillEnterForeground(_ notification: Notification) {
    if !isPaused {
      play()
    }
  }

  // Carried over verbatim: resigning active also resumes playback. It reads like a
  // bug, but changing it would change playback behaviour on backgrounding.
  @objc private func applicationWillResignActive(_ notification: Notification) {
    if !isPaused {
      play()
    }
  }

  public override func removeFromSuperview() {
    releasePlayer()
    super.removeFromSuperview()
  }

  /// Tears the player down, and nothing else.
  ///
  /// The previous implementation also removed the application observers here, and
  /// since it is called from `applySource()` too, background handling was dead
  /// after the first source change. Fabric recycles views through this same path,
  /// which would make that worse. Observers are now only removed in `deinit`.
  @objc public func releasePlayer() {
    if player?.media != nil {
      player?.stop()
    }
    player = nil
    dialogProvider = nil
    delegateProxy = nil
    #if os(tvOS)
      resetDisplayCriteria()
    #endif
  }

  // MARK: - Playback

  @objc public func play() {
    guard let player = player else { return }
    player.play()
    isPaused = false
  }

  @objc public func pause() {
    guard let player = player else { return }
    player.pause()
    isPaused = true
  }

  @objc public func stopPlayer() {
    player?.stop()
  }

  @objc public func applySeek(_ position: Float) {
    guard let player = player, player.isSeekable else { return }
    if position >= 0 && position <= 1 {
      player.position = position
    }
  }

  @objc public func applyResume(_ isResume: Bool) {
    if isResume {
      play()
    } else {
      pause()
    }
  }

  @objc public func applyPaused(_ value: Bool) {
    paused = value
  }

  @objc public func applyAspectRatio(_ ratio: NSString?) {
    videoAspectRatio = ratio
  }

  @objc public func jumpBackward(_ interval: Int32) {
    guard let player = player, let length = player.media?.length.intValue else { return }
    if interval >= 0 && interval <= length {
      player.jumpBackward(interval)
    }
  }

  @objc public func jumpForward(_ interval: Int32) {
    guard let player = player, let length = player.media?.length.intValue else { return }
    if interval >= 0 && interval <= length {
      player.jumpForward(interval)
    }
  }

  // MARK: - Recording and snapshots

  @objc public func startRecording(_ path: String?) {
    guard let path = path else { return }
    _ = player?.startRecording(atPath: path)
    onRecordingState?(["isRecording": true])
  }

  @objc public func stopRecording() {
    _ = player?.stopRecording()
  }

  @objc public func snapshot(_ path: String?) {
    guard let path = path else { return }
    guard let player = player else {
      onSnapshot?(["success": false, "error": "Player is not initialized"])
      return
    }
    player.saveVideoSnapshot(
      at: path,
      withWidth: Int32(player.videoSize.width),
      andHeight: Int32(player.videoSize.height)
    )
    onSnapshot?(["success": true, "path": path, "error": NSNull()])
  }

  // MARK: - Prop application

  private func applySource() {
    if player != nil {
      releasePlayer()
    }
    videoInfo = nil

    guard let source = source,
      let uriString = source["uri"] as? String,
      let uri = URL(string: uriString)
    else {
      return
    }

    let initType = (source["initType"] as? NSNumber)?.intValue ?? 1
    let initOptions = source["initOptions"] as? [Any] ?? []

    // The source dictionary carries its own flag, next to the prop of the same
    // name. Both existed before; keeping both preserves either call path.
    if let accept = source["acceptInvalidCertificates"] as? NSNumber {
      acceptInvalidCertificates = accept.boolValue
    }

    let player: VLCMediaPlayer
    if initType == 1 {
      player = VLCMediaPlayer()
    } else {
      player = VLCMediaPlayer(options: initOptions)
    }
    self.player = player

    // VLC holds delegate and customRenderer weakly, so the proxy has to be owned
    // here.
    let proxy = VlcPlayerDelegateProxy(view: self)
    delegateProxy = proxy
    player.delegate = proxy
    player.drawable = self

    let library = player.libraryInstance
    let consoleLogger = VLCConsoleLogger()
    consoleLogger.level = .debug
    library.loggers = [consoleLogger]

    // Custom UI so the dialogs are answered programmatically instead of being
    // presented; see the VLCCustomDialogRendererProtocol section.
    let dialogProvider = VLCDialogProvider(library: library, customUI: true)
    dialogProvider?.customRenderer = proxy
    self.dialogProvider = dialogProvider

    player.media = VLCMedia(url: uri)

    if autoplay {
      play()
    }

    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: .notifyOthersOnDeactivation
    )
  }

  private func applySubtitleUri() {
    guard let uriString = subtitleUri as String?,
      let url = URL(string: uriString),
      !url.absoluteString.isEmpty,
      let player = player
    else {
      return
    }
    resolvedSubtitleUri = url
    _ = player.addPlaybackSlave(url, type: .subtitle, enforce: true)
  }

  private func applyVideoAspectRatio() {
    guard let player = player else { return }
    guard let ratio = videoAspectRatio as String?, !ratio.isEmpty else {
      player.videoAspectRatio = nil
      return
    }
    // libvlc copies the string (var_SetString), so a pointer valid for the call is
    // enough. The previous implementation leaked the const qualifier instead.
    ratio.withCString { pointer in
      player.videoAspectRatio = UnsafeMutablePointer(mutating: pointer)
    }
  }

  // MARK: - Progress and track info

  private func updateVideoProgress() {
    guard let player = player, !isPaused else { return }
    let currentTime = player.time.intValue
    let remainingTime = player.remainingTime?.intValue ?? 0
    let duration = player.media?.length.intValue ?? 0
    updateVideoInfo()

    onVideoProgress?([
      "currentTime": currentTime,
      "remainingTime": remainingTime,
      "duration": duration,
      "position": player.position,
    ])
  }

  private func updateVideoInfo() {
    guard let player = player else { return }
    var info: [String: Any] = [:]

    if let length = player.media?.length.value {
      info["duration"] = length
    }

    if player.videoSize.width > 0 {
      info["videoSize"] = [
        "width": player.videoSize.width,
        "height": player.videoSize.height,
      ]
    }

    if player.numberOfAudioTracks > 0 {
      info["audioTracks"] = tracks(
        indexes: player.audioTrackIndexes,
        names: player.audioTrackNames,
        count: Int(player.numberOfAudioTracks)
      )
    }

    if player.numberOfSubtitlesTracks > 0 {
      info["textTracks"] = tracks(
        indexes: player.videoSubTitlesIndexes,
        names: player.videoSubTitlesNames,
        count: Int(player.numberOfSubtitlesTracks)
      )
    }

    let next = info as NSDictionary
    if videoInfo != next {
      onVideoLoad?(next)
      videoInfo = next
    }
  }

  private func tracks(indexes: [Any], names: [Any], count: Int) -> [[String: Any]] {
    var result: [[String: Any]] = []
    for i in 0..<count where i < indexes.count && i < names.count {
      result.append(["id": indexes[i], "name": names[i]])
    }
    return result
  }
}

// MARK: - VLC callbacks
//
// These are plain internal methods, not protocol conformances. See
// VlcPlayerDelegateProxy below for why.

extension VlcPlayerView {
  func handleTimeChanged() {
    #if os(tvOS)
      // The track information is not always complete at `.playing`, so keep
      // trying until a frame rate is known.
      applyDisplayCriteriaIfNeeded()
    #endif
    updateVideoProgress()
  }

  func handleStateChanged() {
    guard let player = player else { return }

    switch player.state {
    case .opening:
      onVideoOpen?([:])
      onVideoLoadStart?([:])

    case .paused:
      isPaused = true
      onVideoPaused?([:])

    case .stopped:
      onVideoStopped?([:])

    case .buffering:
      onVideoBuffering?([:])

    case .playing:
      isPaused = false
      #if os(tvOS)
        applyDisplayCriteriaIfNeeded()
      #endif
      onVideoPlaying?([
        "seekable": player.isSeekable,
        "duration": player.media?.length.intValue ?? 0,
      ])

    case .ended:
      onVideoEnded?([
        "currentTime": player.time.intValue,
        "remainingTime": player.remainingTime?.intValue ?? 0,
        "duration": player.media?.length.intValue ?? 0,
        "position": player.position,
      ])

    case .error:
      // The state carries no detail; the error dialog, when VLC shows one, sends
      // its own onVideoError with title and message. Report before releasing, or
      // JS never learns that playback failed.
      onVideoError?([:])
      releasePlayer()

    default:
      break
    }
  }

  func handleRecordingStopped(path: String) {
    onRecordingState?([
      "isRecording": false,
      "recordPath": path,
    ])
  }

  func handleDialogError(title: String, message: String) {
    onVideoError?([
      "title": title,
      "message": message,
    ])
  }

  /// Answers a VLC dialog. `accept` maps to action 1, anything else to cancel.
  func answerDialog(reference: NSValue, accept: Bool) {
    dialogProvider?.postAction(accept ? 1 : 3, forDialogReference: reference)
  }

  var shouldAcceptInvalidCertificates: Bool {
    acceptInvalidCertificates
  }
}

// MARK: - Display criteria (tvOS)
//
// Switches the TV to the content's frame rate when the user has enabled
// Settings > Video and Audio > Match Content > Match Frame Rate. Without it a TV
// running at 50 Hz plays 24 or 60 fps content with judder, and the other way
// round. Only the frame rate is matched: VLCKit 3 renders SDR, so the format
// description deliberately carries no HDR extensions.

#if os(tvOS)
  extension VlcPlayerView {
    fileprivate func applyDisplayCriteriaIfNeeded() {
      guard #available(tvOS 17.0, *) else { return }
      guard !displayCriteriaApplied,
        let player = player,
        let manager = window?.avDisplayManager,
        manager.isDisplayCriteriaMatchingEnabled,
        let video = Self.videoTrackFormat(player.media)
      else {
        return
      }

      var formatDescription: CMVideoFormatDescription?
      CMVideoFormatDescriptionCreate(
        allocator: kCFAllocatorDefault,
        codecType: kCMVideoCodecType_H264,
        width: video.width,
        height: video.height,
        extensions: nil,
        formatDescriptionOut: &formatDescription
      )
      guard let formatDescription = formatDescription else { return }

      manager.preferredDisplayCriteria = AVDisplayCriteria(
        refreshRate: video.frameRate,
        formatDescription: formatDescription
      )
      displayManager = manager
      displayCriteriaApplied = true
    }

    fileprivate func resetDisplayCriteria() {
      displayManager?.preferredDisplayCriteria = nil
      displayManager = nil
      displayCriteriaApplied = false
    }

    /// Frame rate and size of the first video track that reports a frame rate.
    private static func videoTrackFormat(
      _ media: VLCMedia?
    ) -> (frameRate: Float, width: Int32, height: Int32)? {
      guard let tracks = media?.tracksInformation as? [[String: Any]] else { return nil }
      for track in tracks {
        guard (track[VLCMediaTracksInformationType] as? String) == VLCMediaTracksInformationTypeVideo,
          let rate = (track[VLCMediaTracksInformationFrameRate] as? NSNumber)?.floatValue,
          let denominator = (track[VLCMediaTracksInformationFrameRateDenominator] as? NSNumber)?
            .floatValue,
          rate > 0, denominator > 0
        else {
          continue
        }
        let width = (track[VLCMediaTracksInformationVideoWidth] as? NSNumber)?.int32Value ?? 0
        let height = (track[VLCMediaTracksInformationVideoHeight] as? NSNumber)?.int32Value ?? 0
        return (rate / denominator, width, height)
      }
      return nil
    }
  }
#endif

// MARK: - VlcPlayerDelegateProxy

/// Carries the VLCKit protocol conformances so that `VlcPlayerView` does not.
///
/// A public Swift class conforming to a public ObjC protocol must declare those
/// methods public, and Swift then writes `<VLCMediaPlayerDelegate>` into the
/// generated `react_native_vlc_media_player-Swift.h`. Every ObjC++ file importing
/// that header would have to import VLCKit first — behind a `TARGET_OS_TV` branch,
/// because the framework is named MobileVLCKit on iOS and TVVLCKit on tvOS. This
/// proxy is file-private, so it never reaches the generated header and the
/// adapters stay free of VLC.
private final class VlcPlayerDelegateProxy: NSObject {
  private weak var view: VlcPlayerView?

  init(view: VlcPlayerView) {
    self.view = view
    super.init()
  }
}

extension VlcPlayerDelegateProxy: VLCMediaPlayerDelegate {
  func mediaPlayerTimeChanged(_ aNotification: Notification) {
    view?.handleTimeChanged()
  }

  func mediaPlayerStateChanged(_ aNotification: Notification) {
    view?.handleStateChanged()
  }

  func mediaPlayer(_ player: VLCMediaPlayer, recordingStoppedAtPath path: String) {
    view?.handleRecordingStopped(path: path)
  }
}

extension VlcPlayerDelegateProxy: VLCCustomDialogRendererProtocol {
  func showError(withTitle error: String, message: String) {
    view?.handleDialogError(title: error, message: message)
  }

  func showLogin(
    withTitle title: String,
    message: String,
    defaultUsername username: String?,
    askingForStorage: Bool,
    withReference reference: NSValue
  ) {
    view?.handleDialogError(title: title, message: message)
  }

  func showQuestion(
    withTitle title: String,
    message: String,
    type questionType: VLCDialogQuestionType,
    cancel cancelString: String?,
    action1String: String?,
    action2String: String?,
    withReference reference: NSValue
  ) {
    guard let view = view else { return }

    let fullText = "\(title) \(message)".lowercased()
    let isCertificateDialog = ["certificate", "ssl", "tls", "cert", "security"]
      .contains { fullText.contains($0) }

    // Anything that is not an accepted certificate dialog gets cancelled.
    let accept = isCertificateDialog && view.shouldAcceptInvalidCertificates
    view.answerDialog(reference: reference, accept: accept)
  }

  func showProgress(
    withTitle title: String,
    message: String,
    isIndeterminate: Bool,
    position: Float,
    cancel cancelString: String?,
    withReference reference: NSValue
  ) {
    // Progress dialogs are not surfaced.
  }

  func updateProgress(withReference reference: NSValue, message: String?, position: Float) {
    // Progress dialogs are not surfaced.
  }

  func cancelDialog(withReference reference: NSValue) {
    // Nothing to dismiss: there is no presented dialog.
  }
}
