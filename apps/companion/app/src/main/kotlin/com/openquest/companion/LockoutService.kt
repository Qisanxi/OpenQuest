package com.openquest.companion

import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService

/**
 * Foreground service that owns the lockout lifecycle.
 *
 * When started with ACTION_LOCK:
 *   1. Builds a foreground notification (required for FGS)
 *   2. Starts the LocalhostServer (if not already running)
 *   3. Starts the LockoutVpnService (the actual packet blocker)
 *   4. Sets a timer to auto-stop when duration expires
 *
 * When started with ACTION_UNLOCK:
 *   1. Stops the VpnService
 *   2. Tears down the foreground notification
 *   3. Returns to idle
 *
 * We use a LifecycleService (not a plain Service) so we can use coroutines
 * scoped to the service's lifecycle for the timer.
 */
class LockoutService : LifecycleService() {

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_LOCK -> {
                val durationMin = intent.getIntExtra(EXTRA_DURATION_MIN, 60)
                val questId = intent.getStringExtra(EXTRA_QUEST_ID) ?: "unknown"
                val summary = intent.getStringExtra(EXTRA_QUEST_SUMMARY) ?: "OpenQuest active"
                startLockout(questId, summary, durationMin)
            }
            ACTION_UNLOCK -> {
                stopLockout()
            }
        }
        return START_STICKY
    }

    private fun startLockout(questId: String, summary: String, durationMin: Int) {
        val notification = NotificationCompat.Builder(this, CompanionApp.CHANNEL_LOCKOUT)
            .setContentTitle("🔒 OpenQuest lockout active")
            .setContentText(summary)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        // Start as foreground service FIRST — required before starting VpnService
        startForeground(NOTIFICATION_ID, notification)

        // Start the VPN — this needs user consent on Android 4.0+ (one-time)
        // The actual VpnService.prepare() call should have been done in MainActivity
        val vpnIntent = Intent(this, LockoutVpnService::class.java).apply {
            putExtra(EXTRA_QUEST_ID, questId)
            putExtra(EXTRA_DURATION_MIN, durationMin)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(vpnIntent)
        } else {
            startService(vpnIntent)
        }

        // Schedule auto-unlock
        val expiresAt = System.currentTimeMillis() + durationMin * 60 * 1000L
        LockoutState.setActive(questId, expiresAt)
    }

    private fun stopLockout() {
        stopService(Intent(this, LockoutVpnService::class.java))
        stopForeground(STOP_FOREGROUND_REMOVE)
        LockoutState.setInactive()
    }

    companion object {
        const val ACTION_LOCK = "com.openquest.companion.action.LOCK"
        const val ACTION_UNLOCK = "com.openquest.companion.action.UNLOCK"
        const val EXTRA_DURATION_MIN = "duration_min"
        const val EXTRA_QUEST_ID = "quest_id"
        const val EXTRA_QUEST_SUMMARY = "quest_summary"
        private const val NOTIFICATION_ID = 7777
    }
}
