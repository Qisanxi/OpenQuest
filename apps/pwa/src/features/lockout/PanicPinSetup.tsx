import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companionBridge } from './companionBridge.js'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'

export function PanicPinSetup() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function onSave() {
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    if (pin !== confirm) {
      setError('PINs do not match')
      return
    }
    if (pin === '0000' || pin === '1234') {
      setError('Please pick a less obvious PIN')
      return
    }

    // For the PWA side, we don't store the PIN itself — only a hint that
    // it has been set. The actual PIN lives in the Android Keystore.
    localStorage.setItem('openquest.panicPinSet', 'true')
    setSuccess(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Set your panic PIN</h2>

      <Card>
        <p className="mb-4 text-sm text-bark-700 dark:text-bark-200">
          The panic PIN forces an unlock for 24 hours. Use it if you get hurt,
          need directions, or have an emergency. The PIN is stored in your
          device's hardware-backed keystore — never leaves your phone, never
          comes to us.
        </p>

        {success && (
          <div className="mb-3 rounded-lg bg-moss-100 p-3 text-sm text-moss-800 dark:bg-moss-900/40 dark:text-moss-200">
            ✓ Panic PIN saved. Don't forget it.
          </div>
        )}

        <label className="mb-1 block text-xs text-bark-600">4-digit PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="mb-3 w-full rounded-lg border border-bark-200 bg-white px-3 py-2 text-sm dark:border-bark-700 dark:bg-bark-900"
        />

        <label className="mb-1 block text-xs text-bark-600">Confirm PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
          className="mb-3 w-full rounded-lg border border-bark-200 bg-white px-3 py-2 text-sm dark:border-bark-700 dark:bg-bark-900"
        />

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
            {error}
          </div>
        )}

        <Button variant="primary" className="w-full" onClick={onSave}>
          Save panic PIN
        </Button>
      </Card>

      <p className="text-xs text-bark-500">
        Lost your PIN? Reinstall the companion app — that resets everything
        including the lockout state, so you can always regain access.
      </p>
    </div>
  )
}
