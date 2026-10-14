package com.yuanzhou.vlc

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.yuanzhou.vlc.vlcplayer.VlcPlayerViewManager

// Public API: apps that link manually reference ReactVlcPlayerPackage from their
// MainApplication, so it keeps its name.
//
// Careful with comments in this file. Autolinking finds the package with a regex
// over the source text, and the word c-l-a-s-s followed by a word and a colon
// anywhere before the declaration is enough for it to pick the wrong name.
class ReactVlcPlayerPackage : ReactPackage {

    // Deprecated in recent React Native, but abstract in the older releases the
    // 0.74 floor still covers, so it has to stay.
    @Suppress("OVERRIDE_DEPRECATION")
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        emptyList()

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = listOf(VlcPlayerViewManager())
}
