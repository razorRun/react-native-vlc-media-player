//
//  RCTVLCPlayer.swift
//  RCTVLCPlayer
//
//  Created by Konstantin Späth on 25.04.23.
//  Copyright © 2023 Facebook. All rights reserved.
//

import Foundation
import AVFoundation

#if os(iOS)
import MobileVLCKit
#else
import TVVLCKit
#endif

class RCTVLCPlayer : UIView {
    let mediaURL = "https://streams.videolan.org/streams/mp4/Mr_MrsSmith-h264_aac.mp4"
    
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
        
        print("INIT SWIFT")
    }



  required init?(coder: NSCoder) {
      super.init(coder: coder)
  }
    
  @objc
  func applicationWillResignActive(notification: NSNotification) {
      if(!paused) {
          paused = true
      }
  }

  @objc
  func applicationWillEnterForeground(notification: NSNotification) {
      self.applyModifiers()
  }

    func applyModifiers() {
        if(!paused) {
            self.play()
        }
  }

  func play() {
      if(_player != nil) {
          _player.play()
          _paused = false
          _started = true
      }
  }

  func setResume(_ autoplay: Bool) {

  }

  @objc
  func setSource(_ source: NSDictionary) {
      print("SetSource!!")
      
      print("Source \(source as AnyObject)")
    if(_player != nil) {
      _release()
    }
    _source = source
    _videoInfo = nil
      
    guard let uri = source["uri"] as? String else { return }
    let autoPlay = source["autoPlay"] as? Bool ?? true

    _player = VLCMediaPlayer()
    
    _player.drawable = self
    _player.delegate = self
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
    
    @objc var paused: Bool = false {
      didSet {
          self._paused = paused
          if(_player != nil) {
              if(!paused) {
                  self.play()
              } else if(_player.canPause) {
                  _player.pause()
              }
          }
      }
    }

}

extension RCTVLCPlayer : VLCMediaPlayerDelegate {


}
