/**
 * Soft lock — fallback when the companion app is not installed.
 *
 * A "soft lock" is NOT a real lock. It's:
 *   - Fullscreen overlay covering the viewport
 *   - Persistent notification via the Notifications API
 *   - Wake lock to prevent screen sleep (so the timer is visible)
 *   - Focus trap — if the user switches tabs and comes back, the timer
 *     is still ticking, but we can't actually stop them from leaving
 *
 * This is the best a PWA can do without a native companion. The lockout
 * banner explicitly tells the user "soft lock active — install the
 * companion for a real lock".
 */

import type { LockoutState } from '@shared/lockout'

interface SoftLockHandle {
  release: () => void
  state: LockoutState
}

let wakeLock: WakeLockSentinel | null = null

export async function engageSoftLock(questId: string, durationMin: number): Promise<SoftLockHandle> {
  // Request screen wake lock
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
    } catch {
      // wake lock denied — fine, just means screen may sleep
    }
  }

  // Show a persistent notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('OpenQuest lock active', {
      body: `Phone soft-locked for ${durationMin} min. Complete your quest to unlock.`,
      tag: `openquest-${questId}`,
      requireInteraction: true,
    })
  }

  return {
    state: 'locked',
    release: async () => {
      if (wakeLock) {
        await wakeLock.release()
        wakeLock = null
      }
      // Close the persistent notification
      if ('Notification' in window) {
        Notification.requestPermission().then(() => {
          // Notifications auto-close on release for non-persistent; for
          // persistent ones, we'd need a service worker to close them.
        })
      }
    },
  }
}

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false)
  if (Notification.permission === 'granted') return Promise.resolve(true)
  return Notification.requestPermission().then((p) => p === 'granted')
}
