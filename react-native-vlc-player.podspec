Pod::Spec.new do |s|
  s.name         = "react-native-vlc-player"
  s.version      = "0.3.4"
  s.summary      = "Ro"
  s.requires_arc = true
  s.author       = { 'roshan.milinda' => 'rmilinda@gmail.com' }
  s.license      = 'MIT'
  s.homepage     = 'https://github.com/razorRun/react-native-vlc-player.git'
  s.source       = { :git => "https://github.com/razorRun/react-native-vlc-player.git" }
  s.source_files = 'ios/RCTVLCPlayer/*'
  s.platform     = :ios, "8.0"
  s.static_framework = true  
  s.dependency 'React'
  s.dependency 'MobileVLCKit-unstable', '3.0.0a44'
end
