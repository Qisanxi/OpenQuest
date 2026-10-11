package com.openquest.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Auto-resume lockout after device reboot.
 *
 * If the phone reboots during a quest (battery died, user forced a restart),
 * we want to either:
 *   1. Resume the lockout if time remains, OR
 *   2. Mark the quest as expired and unlock
 *
 * For the MVP, we just unlock on reboot. This is the safer default —
 * losing state means the phone is usable, not stuck. Persistence is
 * a stretch goal.
 *
 * TODO: persist LockoutState to SharedPreferences, restore here.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        // No-op for MVP — phone unlocks on reboot.
    }
}
