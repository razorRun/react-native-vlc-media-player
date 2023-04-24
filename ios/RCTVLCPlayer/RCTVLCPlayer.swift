//
//  Player.swift
//  RCTVLCPlayer
//
//  Created by Konstantin Späth on 21.04.23.
//  Copyright © 2023 熊川. All rights reserved.
//

import Foundation
import AVFoundation

import Foundation
import AVFoundation
#if os(iOS)
import MobileVLCKit
#else
import TVVLCKit
#endif

class RCTVLCPlayer : UIView {
    private var _eventDispatcher:RCTEventDispatcher!
    private var _player:VLCMediaPlayer!
    private var _source:NSDictionary!
    private var _paused = false
    private var _started = false
    private var _subtitleUri:String!
    private var _videoInfo:NSDictionary!

    init(eventDispatcher: RCTEventDispatcher!) {
      super.init(frame: CGRect(x: 0, y: 0, width: 100, height: 100))
      _eventDispatcher = eventDispatcher
      NotificationCenter.default.addObserver(self, selector: #selector(UIApplicationDelegate.applicationWillResignActive(_:)), name: UIApplication.willResignActiveNotification, object: nil)

      NotificationCenter.default.addObserver(self, selector: #selector(UIApplicationDelegate.applicationWillEnterForeground(_:)), name: UIApplication.willEnterForegroundNotification, object: nil)
    }



  required init?(coder: NSCoder) {
    super.init(coder: coder)
  }

  func applicationWillResignActive(notification: NSNotification) {

  }

  func applicationWillEnterForeground(notification: NSNotification) {

  }

  func applyModifiers() {

  }

  func setPaused(paused: Bool) {

  }

  func play() {

  }

  func setResume(autoplay: Bool) {

  }

  func setSource(source: NSDictionary) {
    if(_player != nil) {
      _release()
    }
    _source = source
    _videoInfo = nil

    let uri = source.object(forKey: "uri") as! String
    let autoplay:Bool = RCTConvert.bool(source.object(forKey: "autoplay"))
    let _uri:NSURL! = NSURL.init(string: uri)
    let initOptions = source.object(forKey: "initOptions") as! NSDictionary

    _player = VLCMediaPlayer()

    //_player.delegate = self
    _player.scaleFactor = 0

    let media = VLCMedia.init(url: URL(string: uri)!)

    let options = ["rtsp-tcp": "1", "input-repeat": "1000"]
    media.addOptions(options)

    _player.media = media
    _player.delegate = self

    try? AVAudioSession.sharedInstance().setActive(false, options: AVAudioSession.SetActiveOptions.notifyOthersOnDeactivation)

    self.play()

  }

  func _release() {
    if(_player != nil) {
      _player.pause()
      _player.stop()
      _player = nil
      _eventDispatcher = nil
      NotificationCenter.default.removeObserver(self)
    }
  }

}

extension RCTVLCPlayer : VLCMediaPlayerDelegate {


}
