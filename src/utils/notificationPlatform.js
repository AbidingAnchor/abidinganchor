import { Capacitor } from '@capacitor/core'

function isIosUserAgent() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function getNotificationPlatform() {
  const isNative = Capacitor.isNativePlatform()
  const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window
  const isStandalonePwa = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const isIos = isIosUserAgent()
  const isIosPwa = isIos && isStandalonePwa
  const isBrowserRuntime = !isNative && hasServiceWorker && hasNotificationApi

  return {
    isNativeCapacitor: isNative,
    isBrowserRuntime,
    isPwaOrBrowser: isBrowserRuntime,
    isIos,
    isIosPwa,
    isStandalonePwa,
    requiresUserGestureForPermission: isIos,
  }
}
