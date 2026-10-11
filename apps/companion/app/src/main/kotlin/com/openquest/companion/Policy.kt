package com.openquest.companion

import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStream

/**
 * Lockout policy.
 *
 * Defines which domains remain reachable during a lockout. The list is
 * shipped as a JSON asset (allowed_domains.json) so it can be updated
 * without rebuilding the app — but we also have a hardcoded fallback
 * in case the asset is missing.
 *
 * NOTE: emergency calls (911/112/etc.) are NOT domain-based. They go
 * through the cellular modem and are completely unaffected by VpnService.
 * This is by design — Android does not let VpnService block emergency
 * calls even if it wanted to.
 */
object Policy {

    val ALLOWED_DOMAINS: List<String> = listOf(
        // OpenQuest PWA itself (production domain)
        "openquest.local",
        // OSM tiles for navigation
        "tile.openstreetmap.org",
        "a.tile.openstreetmap.org",
        "b.tile.openstreetmap.org",
        "c.tile.openstreetmap.org",
        // Overpass API (cached locally, but allowed just in case)
        "overpass-api.de",
        // Routing
        "routing.openstreetmap.de",
        // Open-Meteo weather (for quest context)
        "api.open-meteo.com",
    )

    /**
     * Load allowed domains from the assets file, falling back to the
     * hardcoded list if the file is missing or malformed.
     */
    fun loadFromAssets(stream: InputStream?): List<String> {
        if (stream == null) return ALLOWED_DOMAINS
        return try {
            val text = stream.bufferedReader().use { it.readText() }
            val json = JSONObject(text)
            val arr = json.optJSONArray("allowed") ?: return ALLOWED_DOMAINS
            val result = mutableListOf<String>()
            for (i in 0 until arr.length()) {
                arr.getString(i).takeIf { it.isNotBlank() }?.let { result.add(it) }
            }
            result.ifEmpty { ALLOWED_DOMAINS }
        } catch (_: Exception) {
            ALLOWED_DOMAINS
        }
    }
}
