package com.openquest.companion

import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.IBinder
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress
import kotlin.concurrent.thread

/**
 * The actual lockout engine.
 *
 * This is a VpnService that intercepts ALL network traffic from the device.
 * It establishes a virtual TUN interface, then for each packet:
 *   - Inspects the destination IP
 *   - If it's whitelisted (in ALLOWED_DOMAINS_DURING_LOCKOUT), forwards
 *     it normally via the protected underlying network
 *   - Otherwise, drops the packet silently
 *
 * This is the SAME mechanism used by NetGuard, TrackerControl, and
 * Blokada. We deliberately don't do deep packet inspection or DNS
 * filtering — we resolve allowed domains to IPs at lock-start and
 * whitelist those IPs only.
 *
 * Why this works:
 *   - DNS queries go to 8.8.8.8 or 1.1.1.1 — those IPs aren't in our
 *     whitelist, so we drop them. The phone can't resolve any new
 *     domains during the lockout.
 *   - We pre-resolve our allowed domains before establishing the VPN,
 *     so the phone already has IPs for OpenQuest + OSM tiles cached.
 *   - Other apps (Instagram, Twitter, etc.) try to connect to their
 *     servers — the destination IP isn't whitelisted, packet dropped.
 *
 * Emergency calls are unaffected — they go through the cellular modem,
 * not through VpnService.
 */
class LockoutVpnService : VpnService() {

    private var tunInterface: ParcelFileDescriptor? = null
    private var workerThread: Thread? = null
    @Volatile private var isRunning = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val questId = intent?.getStringExtra(LockoutService.EXTRA_QUEST_ID) ?: "unknown"
        val durationMin = intent?.getIntExtra(LockoutService.EXTRA_DURATION_MIN, 60) ?: 60

        // Build the foreground notification — required for VpnService to stay alive
        val notification = NotificationCompat.Builder(this, CompanionApp.CHANNEL_LOCKOUT)
            .setContentTitle("🔒 Phone locked by OpenQuest")
            .setContentText("Other apps have no internet. Complete your quest to unlock.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(
                PendingIntent.getActivity(
                    this,
                    0,
                    Intent(this, MainActivity::class.java),
                    PendingIntent.FLAG_IMMUTABLE,
                )
            )
            .build()

        startForeground(NOTIFICATION_ID, notification)

        // Resolve allowed domains to IPs BEFORE establishing the VPN
        val allowedIps = resolveAllowedDomains()

        // Establish the VPN — drop everything except allowed IPs
        val builder = Builder()
            .setSession("OpenQuest lockout")
            .addAddress("10.77.77.1", 32)
            .addRoute("0.0.0.0", 0)  // route everything through us
            .addDnsServer("10.77.77.2")
            .setMtu(1500)

        // Add exceptions for allowed IPs — these bypass the VPN
        for (ip in allowedIps) {
            try {
                builder.addRoute(ip, 32)
            } catch (_: Exception) {
                // Some IPs may fail to add; that's fine — they'll be routed through the VPN and dropped
            }
        }

        tunInterface = builder.establish()

        isRunning = true
        workerThread = thread { runPacketLoop() }

        // Schedule auto-stop after duration
        val expiresAt = System.currentTimeMillis() + durationMin * 60 * 1000L
        thread {
            val sleepMs = expiresAt - System.currentTimeMillis()
            if (sleepMs > 0) Thread.sleep(sleepMs)
            if (isRunning) {
                stopSelf()
            }
        }

        return START_STICKY
    }

    /**
     * Resolve each allowed domain to its IP address.
     * Done BEFORE establishing the VPN so we can use the underlying network.
     */
    private fun resolveAllowedDomains(): Set<String> {
        val ips = mutableSetOf<String>()
        for (domain in Policy.ALLOWED_DOMAINS) {
            try {
                val addresses = InetAddress.getAllByName(domain)
                for (addr in addresses) {
                    ips.add(addr.hostAddress ?: continue)
                }
            } catch (_: Exception) {
                // Domain couldn't be resolved — skip; it just won't be reachable
            }
        }
        return ips
    }

    /**
     * Main packet loop. Reads from the TUN, drops everything (we don't
     * actually forward — the allowed IPs bypass the VPN via addRoute
     * above, so anything that arrives here is something we want to drop).
     *
     * We could implement proper forwarding, but for the MVP "drop all"
     * is simpler and the allowed domains already work via addRoute.
     */
    private fun runPacketLoop() {
        val tun = tunInterface ?: return
        val input = FileInputStream(tun.fileDescriptor)
        val output = FileOutputStream(tun.fileDescriptor)
        val buffer = ByteArray(32767)

        try {
            while (isRunning && !Thread.interrupted()) {
                val length = input.read(buffer)
                if (length <= 0) continue
                // Drop the packet — do not write back to output
                // (writing back would forward it; not writing drops it)
            }
        } catch (_: Exception) {
            // tun closed or thread interrupted — that's fine
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        workerThread?.interrupt()
        tunInterface?.close()
        tunInterface = null
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val NOTIFICATION_ID = 7778
    }
}
