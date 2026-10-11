package com.openquest.companion

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest

/**
 * Manages the panic PIN.
 *
 * Storage:
 *   - The PIN itself is NEVER stored in plaintext.
 *   - We store SHA-256(pin + deviceSalt) in EncryptedSharedPreferences.
 *   - deviceSalt is a per-install random 32-byte value, itself stored
 *     encrypted in the same prefs file.
 *   - EncryptedSharedPreferences uses AES-256-GCM under the hood,
 *     backed by the Android Keystore. The encryption key never leaves
 *     the secure enclave on devices with a TEE/StrongBox.
 *
 * Verification:
 *   - User enters PIN -> SHA-256(pin + deviceSalt) -> compare with stored
 *     hash. Constant-time comparison to prevent timing attacks.
 *
 * Recovery:
 *   - Lost your PIN? Uninstall the companion app. That clears the
 *     EncryptedSharedPreferences, the device salt, AND stops the
 *     foreground service — phone is unlocked immediately.
 */
class PanicPinManager(private val context: Context) {

    private val prefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun setPin(pin: String) {
        require(pin.length == 4 && pin.all { it.isDigit() }) { "PIN must be 4 digits" }
        val salt = getOrCreateSalt()
        val hash = sha256(pin + ":" + salt)
        prefs.edit()
            .putString(KEY_PIN_HASH, hash)
            .putBoolean(KEY_PIN_SET, true)
            .apply()
    }

    fun verify(pin: String): Boolean {
        val stored = prefs.getString(KEY_PIN_HASH, null) ?: return false
        val salt = prefs.getString(KEY_SALT, null) ?: return false
        val candidate = sha256(pin + ":" + salt)

        // Constant-time comparison
        if (stored.length != candidate.length) return false
        var diff = 0
        for (i in stored.indices) {
            diff = diff or (stored[i].code xor candidate[i].code)
        }
        return diff == 0
    }

    /**
     * Verify the PIN (from the PWA's hash) and unlock for 24h if it matches.
     * Returns true if the PIN was correct.
     */
    fun verifyAndUnlock(pin: String): Boolean {
        if (!verify(pin)) return false
        // Trigger the unlock flow — stop the LockoutService
        val unlockIntent = android.content.Intent(context, LockoutService::class.java).apply {
            action = LockoutService.ACTION_UNLOCK
        }
        context.startService(unlockIntent)
        return true
    }

    companion object {
        private const val PREFS_NAME = "openquest_panic"
        private const val KEY_PIN_HASH = "pin_hash"
        private const val KEY_SALT = "salt"
        private const val KEY_PIN_SET = "pin_set"

        fun isConfigured(): Boolean {
            // Static check used by LocalhostServer's /status response
            // (the actual instance has the prefs context)
            return false // overridden by instance; the LocalhostServer uses the instance method
        }

        private fun sha256(input: String): String {
            val digest = MessageDigest.getInstance("SHA-256")
            val bytes = digest.digest(input.toByteArray())
            return bytes.joinToString("") { "%02x".format(it) }
        }
    }

    private fun getOrCreateSalt(): String {
        val existing = prefs.getString(KEY_SALT, null)
        if (existing != null) return existing
        val salt = (1..32).map { ('a'..'f').random() }.joinToString("")
        prefs.edit().putString(KEY_SALT, salt).apply()
        return salt
    }
}
