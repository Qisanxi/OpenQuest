package com.openquest.companion

import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Localhost HTTP server.
 *
 * Binds to 127.0.0.1:7777 ONLY. No remote client can reach it.
 *
 * Endpoints:
 *   GET  /status   -> current lockout state JSON
 *   POST /lock     -> engage lockout (validates HMAC signature)
 *   POST /unlock   -> release lockout (validates HMAC signature)
 *   POST /panic    -> force-unlock for 24h (validates panic PIN hash)
 *
 * Every request (except /status) requires an HMAC-SHA256 signature
 * computed over the request payload using the pairing secret. Unsigned
 * or wrongly-signed requests are rejected with 401.
 *
 * The pairing secret is generated on first launch and shown to the user
 * as a QR code in MainActivity. The PWA scans the QR (via the CompanionPair
 * screen) and stores the secret in localStorage.
 */
class LocalhostServer(
    private val port: Int = 7777,
    private val secretProvider: () -> String,
    private val onLock: (questId: String, summary: String, durationMin: Int) -> Unit,
    private val onUnlock: () -> Unit,
    private val onPanic: (pinHash: String) -> Boolean,
) : NanoHTTPD("127.0.0.1", port) {

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri
        val method = session.method

        return try {
            when (uri to method) {
                "/status" to Method.GET -> statusResponse()
                "/lock" to Method.POST -> handleLock(session)
                "/unlock" to Method.POST -> handleUnlock(session)
                "/panic" to Method.POST -> handlePanic(session)
                else -> newFixedLengthResponse(Response.Status.NOT_FOUND, "application/json", """{"error":"not_found"}""")
            }
        } catch (e: Exception) {
            newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                """{"error":"${e.message?.replace("\"', "")}"}""",
            )
        }
    }

    private fun statusResponse(): Response {
        val state = LockoutState.current()
        val json = JSONObject().apply {
            put("state", state.state.name.lowercase())
            put("lockedAt", state.lockedAt ?: JSONObject.NULL)
            put("expiresAt", state.expiresAt ?: JSONObject.NULL)
            put("questId", state.questId ?: JSONObject.NULL)
            put("panicPinConfigured", PanicPinManager.isConfigured())
            put("version", BuildConfig.VERSION_NAME)
        }
        return newFixedLengthResponse(Response.Status.OK, "application/json", json.toString())
    }

    private fun handleLock(session: IHTTPSession): Response {
        val body = parseBody(session)
        val signature = body.getString("signature")
        val timestamp = body.getLong("timestamp")
        val durationMin = body.getInt("durationMin")
        val questId = body.getString("questId")
        val questSummary = body.getString("questSummary")

        // Validate signature
        val payload = "$timestamp|$durationMin|$questId|$questSummary"
        if (!verifyHmac(payload, signature)) {
            return newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", """{"error":"bad_signature"}""")
        }

        // Reject stale requests (>30s old)
        if (System.currentTimeMillis() - timestamp > 30_000) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json", """{"error":"stale_request"}""")
        }

        onLock(questId, questSummary, durationMin)
        return newFixedLengthResponse(Response.Status.OK, "application/json", """{"ok":true}""")
    }

    private fun handleUnlock(session: IHTTPSession): Response {
        val body = parseBody(session)
        val signature = body.getString("signature")
        val timestamp = body.getLong("timestamp")
        val reason = body.getString("reason")

        val payload = "$timestamp|$reason|unknown"
        if (!verifyHmac(payload, signature)) {
            return newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", """{"error":"bad_signature"}""")
        }

        onUnlock()
        return newFixedLengthResponse(Response.Status.OK, "application/json", """{"ok":true}""")
    }

    private fun handlePanic(session: IHTTPSession): Response {
        val body = parseBody(session)
        val signature = body.getString("signature")
        val timestamp = body.getLong("timestamp")
        val pinHash = body.getString("pinHash")

        val payload = "$timestamp|$pinHash"
        if (!verifyHmac(payload, signature)) {
            return newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", """{"error":"bad_signature"}""")
        }

        val ok = onPanic(pinHash)
        return if (ok) {
            newFixedLengthResponse(Response.Status.OK, "application/json", """{"ok":true}""")
        } else {
            newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", """{"error":"bad_pin"}""")
        }
    }

    private fun parseBody(session: IHTTPSession): JSONObject {
        val files = HashMap<String, String>()
        session.parseBody(files)
        val raw = files["postData"] ?: ""
        return JSONObject(raw)
    }

    private fun verifyHmac(payload: String, signatureHex: String): Boolean {
        val secret = secretProvider()
        if (secret.isEmpty()) return false

        val key = SecretKeySpec(secret.toByteArray(), "HmacSHA256")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(key)
        val expected = mac.doFinal(payload.toByteArray()).joinToString("") { "%02x".format(it) }

        // Constant-time comparison to prevent timing attacks
        if (expected.length != signatureHex.length) return false
        var diff = 0
        for (i in expected.indices) {
            diff = diff or (expected[i].code xor signatureHex[i].code)
        }
        return diff == 0
    }
}
