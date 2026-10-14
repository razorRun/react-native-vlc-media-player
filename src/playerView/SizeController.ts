/**
 * 高度定义
 * Created by yuanzhou.xu on 17/2/18.
 */
import { PixelRatio, Dimensions, Platform, StatusBar } from 'react-native';

const initialDeviceHeight = 667;
const initialDeviceWidth = 375;
const deviceHeight = Dimensions.get('window').height;
const deviceWidth = Dimensions.get('window').width;

let statusBarHeight = 20; // 初始状态栏高度
let topBarHeight = 44; // 初始导航栏高度
let tabBarHeight = 49; // 初始标签栏高度
let isIphoneXLike = false;

// The conversion keeps this numeric throughout. It used to be reassigned from
// `toFixed(2)`, so `getChangeRatio()` returned a string on most devices and the
// number 1 on others.
let changeRatio = Number(
  Math.min(
    deviceHeight / initialDeviceHeight,
    deviceWidth / initialDeviceWidth
  ).toFixed(2)
);

if (deviceWidth > 375 && deviceWidth <= 1125 / 2) {
  statusBarHeight = 27;
  topBarHeight = 66;
  tabBarHeight = 60;
} else if (deviceWidth > 1125 / 2) {
  statusBarHeight = 30;
  topBarHeight = 66;
  tabBarHeight = 60;
}

if (Platform.OS !== 'ios') {
  statusBarHeight = 20;
  if (deviceWidth > 375 && deviceWidth <= 1125 / 2) {
    statusBarHeight = 25;
  } else if (deviceWidth > 1125 / 2 && deviceWidth < 812) {
    statusBarHeight = 25;
  }
  if (StatusBar.currentHeight) {
    statusBarHeight = StatusBar.currentHeight;
  }
}

if (deviceWidth >= 375 && deviceWidth < 768) {
  topBarHeight = 44;
  tabBarHeight = 49;
  changeRatio = 1;
}

if (deviceHeight >= 812) {
  statusBarHeight = 44;
  isIphoneXLike = true;
}

/** 返回状态栏高度 */
export function getStatusBarHeight(): number {
  return statusBarHeight;
}

/** 返回导航栏高度 */
export function getTopBarHeight(): number {
  return topBarHeight;
}

/** 返回标签栏高度 */
export function getTabBarHeight(): number {
  return tabBarHeight;
}

export function getTopHeight(): number {
  return topBarHeight + statusBarHeight;
}

/** 返回变更比例 */
export function getChangeRatio(): number {
  return changeRatio;
}

/** 获取 tabBar 比例 */
export function getTabBarRatio(): number {
  return tabBarHeight / 49;
}

/** 获取 TopBar 比例 */
export function getTopBarRatio(): number {
  return changeRatio;
}

export function isIphoneX(): boolean {
  return isIphoneXLike;
}

/** Kept for parity with the original module, which read PixelRatio at import time. */
export function getPixelRatio(): number {
  return PixelRatio.get();
}
