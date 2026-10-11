package com.openquest.companion

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

/**
 * Application class. Sets up notification channels on first launch.
 *
 * OpenQuest uses two notification channels:
 *   - "lockout" — the persistent foreground service notification while
 *     the phone is locked. Cannot be dismissed.
 *   - "panic" — one-shot alerts when the panic PIN is used or the
 *     lockout auto-expires.
 *
 * The channels are created here so they exist before the first
 * LockoutService starts.
 */
class CompanionApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = getSystemService(NotificationManager::class.java)

        val lockout = NotificationChannel(
            CHANNEL_LOCKOUT,
            "Lockout active",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Shown when your phone is locked during an OpenQuest quest"
            setShowBadge(false)
            enableVibration(false)
            setSound(null, null)
        }

        val panic = NotificationChannel(
            CHANNEL_PANIC,
            "Panic unlock",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Alerts when the panic PIN is used or the lockout expires"
        }

        manager.createNotificationChannels(listOf(lockout, panic))
    }

    companion object {
        const val CHANNEL_LOCKOUT = "openquest.lockout"
        const val CHANNEL_PANIC = "openquest.panic"
    }
}
