import { useLockout } from '../../app/LockoutProvider.js'

export function LockoutBanner() {
  const { state, companionInstalled } = useLockout()

  if (state === 'locked') {
    return (
      <div className="rounded-lg bg-red-100 p-3 text-sm font-medium text-red-900 dark:bg-red-950 dark:text-red-100">
        🔒 Phone locked. Other apps have no internet. Complete your quest to unlock.
      </div>
    )
  }

  if (!companionInstalled) {
    return (
      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        ⚠️ Companion app not detected. Only soft lock available.
        Install the companion APK for a real lockout.
      </div>
    )
  }

  return null
}
