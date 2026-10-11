package com.openquest.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

/**
 * Main activity — the companion's UI.
 *
 * Three screens:
 *   1. Setup: pair with the PWA (show a QR-style pairing code), set panic PIN
 *   2. Status: show current lockout state (locked/unlocked), time remaining
 *   3. Panic: enter the PIN to force-unlock for 24h
 *
 * The UI is intentionally minimal — the companion is a tiny utility,
 * not a primary app. Most of the time it sits in the background as a
 * foreground service.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    CompanionScreen(
                        onPanic = { pin ->
                            lifecycleScope.launch {
                                val ok = PanicPinManager(this@MainActivity).verifyAndUnlock(pin)
                                // UI state updates via re-composition; the panic manager
                                // starts the unlock flow internally.
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun CompanionScreen(onPanic: (String) -> Unit) {
    var pin by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Checking…") }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                text = "OpenQuest Companion",
                style = MaterialTheme.typography.headlineMedium,
            )

            Text(
                text = "Status: $status",
                style = MaterialTheme.typography.bodyLarge,
            )

            Text(
                text = """
                    OpenQuest Companion runs a localhost HTTP server on port 7777.
                    The OpenQuest PWA sends lock/unlock requests here. When a lock
                    is active, this app runs a VpnService that drops all network
                    traffic except for whitelisted domains (OpenQuest itself, OSM
                    tiles, emergency calls).

                    The companion is ~200 lines of Kotlin. You can audit it in
                    an afternoon.
                """.trimIndent(),
                style = MaterialTheme.typography.bodySmall,
            )

            // Panic PIN entry
            Text("Panic unlock (24h):")
            Text(
                text = "Enter your 4-digit PIN to force-unlock for 24 hours.",
                style = MaterialTheme.typography.bodySmall,
            )
            // In a real implementation this would be a pin entry widget.
            // For the MVP scaffold, we just wire up the callback.
            Button(
                onClick = { onPanic(pin) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                ),
            ) {
                Text("Force unlock")
            }
        }
    }
}
