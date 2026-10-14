require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
vlc_version = package["vlc"]["ios"]

Pod::Spec.new do |s|
  s.name         = "react-native-vlc-media-player"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.requires_arc = true
  s.author       = { 'roshan.milinda' => 'rmilinda@gmail.com' }
  s.license      = 'MIT'
  s.homepage     = 'https://github.com/razorRun/react-native-vlc-media-player.git'
  s.source       = { :git => "https://github.com/razorRun/react-native-vlc-media-player.git", :tag => "v#{s.version}" }

  # Swift core plus the two architecture adapters. The adapters guard themselves on
  # RCT_NEW_ARCH_ENABLED, so both are always compiled and exactly one has content.
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version = '5.0'

  # 13.4 is React Native 0.74's minimum, which is the floor this package declares
  # in peerDependencies.
  s.ios.deployment_target = "13.4"
  s.tvos.deployment_target = "13.4"
  s.static_framework = true

  # Defines RCT_NEW_ARCH_ENABLED and wires up the React dependencies for both
  # architectures.
  install_modules_dependencies(s)
  s.ios.dependency 'MobileVLCKit', vlc_version
  s.tvos.dependency 'TVVLCKit', vlc_version
end
