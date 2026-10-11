import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'

export function Install() {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Install OpenQuest</h2>

      <Card>
        <h3 className="mb-2 font-semibold">1. Add to home screen</h3>
        <p className="text-sm text-bark-700 dark:text-bark-200">
          Tap your browser's "Add to Home Screen" / "Install" option.
          OpenQuest runs as a PWA — no app store needed.
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">2. Install the companion (optional)</h3>
        <p className="mb-3 text-sm text-bark-700 dark:text-bark-200">
          The companion is a tiny Android app that actually locks your phone
          when a quest starts. Without it, OpenQuest uses a "soft lock"
          (fullscreen overlay) which you can dismiss — install the
          companion for a real lockout.
        </p>
        <Button variant="secondary" className="w-full" onClick={() => navigate('/onboarding/companion')}>
          Pair the companion →
        </Button>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">3. Set your panic PIN</h3>
        <p className="mb-3 text-sm text-bark-700 dark:text-bark-200">
          The panic PIN force-unlocks for 24h. Use it if you get hurt,
          need directions, or have an emergency.
        </p>
        <Button variant="secondary" className="w-full" onClick={() => navigate('/onboarding/panic-pin')}>
          Set panic PIN →
        </Button>
      </Card>

      <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
        Done — start questing
      </Button>
    </div>
  )
}
