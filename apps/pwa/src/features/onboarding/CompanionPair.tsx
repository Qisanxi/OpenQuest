import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companionBridge } from '../lockout/companionBridge.js'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'

export function CompanionPair() {
  const navigate = useNavigate()
  const [pairingCode, setPairingCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'paired' | 'failed'>('idle')

  async function onPair() {
    if (!pairingCode || pairingCode.length < 8) {
      setStatus('failed')
      return
    }
    setStatus('checking')

    // The pairing code IS the secret. Store it.
    companionBridge.setPairingSecret(pairingCode.trim())

    // Verify by calling /status on the companion
    const result = await companionBridge.getStatus()
    if (result) {
      setStatus('paired')
      setTimeout(() => navigate('/quests'), 1500)
    } else {
      setStatus('failed')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pair your companion</h2>

      <Card>
        <p className="mb-3 text-sm text-bark-700 dark:text-bark-200">
          Open the OpenQuest companion app on your phone. It will show a
          pairing code. Type it below to bind the PWA to the companion.
        </p>

        <input
          type="text"
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value)}
          placeholder="e.g. abc123def456"
          className="mb-3 w-full rounded-lg border border-bark-200 bg-white min-h-11 px-3 py-2 text-base sm:text-sm dark:border-bark-700 dark:bg-bark-900"
        />

        {status === 'paired' && (
          <div className="mb-3 rounded-lg bg-moss-100 p-3 text-sm text-moss-800 dark:bg-moss-900/40 dark:text-moss-200">
            ✓ Paired. Companion detected.
          </div>
        )}
        {status === 'failed' && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
            ✗ Could not reach the companion. Make sure the companion app is
            running and the pairing code is correct.
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          disabled={status === 'checking'}
          onClick={onPair}
        >
          {status === 'checking' ? 'Checking…' : 'Pair'}
        </Button>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">Don't have the companion?</h3>
        <p className="mb-3 text-sm text-bark-700 dark:text-bark-200">
          Download the APK from GitHub Releases and sideload it. The
          companion is a tiny (~200 LOC) Kotlin app — you can read the
          whole thing in an afternoon.
        </p>
        <a
          href="https://github.com/Qisanxi/OpenQuest/releases"
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          <Button variant="secondary" className="w-full">
            Download APK
          </Button>
        </a>
      </Card>
    </div>
  )
}
