package com.yuanzhou.vlc.vlcplayer

import android.view.View
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.VlcPlayerViewManagerDelegate
import com.facebook.react.viewmanagers.VlcPlayerViewManagerInterface

/**
 * New Architecture base of [VlcPlayerViewManager].
 *
 * Props and commands reach the manager through the delegate codegen generates
 * from src/VlcPlayerViewNativeComponent.ts, so the interface below is the whole
 * contract: a prop or command missing from the manager is a compile error.
 */
abstract class VlcPlayerViewManagerSpec<T : View> :
    SimpleViewManager<T>(),
    VlcPlayerViewManagerInterface<T> {

    private val delegate: ViewManagerDelegate<T> = VlcPlayerViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<T> = delegate
}
