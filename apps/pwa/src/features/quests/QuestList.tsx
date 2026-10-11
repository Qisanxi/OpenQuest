import { useNavigate } from 'react-router-dom'
import { useGemma } from '../../app/GemmaProvider.js'
import { useQuests } from '../../app/QuestProvider.js'
import { useLockout } from '../../app/LockoutProvider.js'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'
import { Timer } from '../../components/Timer.js'

export function QuestList() {
  const navigate = useNavigate()
  const { status, loadProgress, error, wake } = useGemma()
  const { activeQuest, generating, generate } = useQuests()
  const { state: lockoutState } = useLockout()

  return (
    <div className="space-y-4">
      <header className="text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-moss-700 dark:text-moss-300">
          OpenQuest
        </h1>
        <p className="mt-1 text-sm text-bark-600 dark:text-bark-300">
          Open-source quests that lock you out until you touch grass.
        </p>
      </header>

      <GemmaStatus
        status={status}
        progress={loadProgress}
        error={error}
        onWake={wake}
      />

      <LockoutBanner state={lockoutState} />

      {activeQuest ? (
        <ActiveQuestCard questId={activeQuest.id} />
      ) : (
        <Card>
          <p className="mb-4 text-sm text-bark-700 dark:text-bark-200">
            No active quest. Tap below to generate one with the local Gemma model.
          </p>
          <Button
            variant="primary"
            className="w-full"
            disabled={generating || status !== 'ready'}
            onClick={() => generate()}
          >
            {generating ? 'Generating…' : 'Generate a quest'}
          </Button>
        </Card>
      )}

      <Button variant="secondary" className="w-full" onClick={() => navigate('/location')}>
        Set location
      </Button>
    </div>
  )
}

function GemmaStatus({
  status,
  progress,
  error,
  onWake,
}: {
  status: string
  progress: number
  error: string | null
  onWake: () => void
}) {
  if (status === 'ready') {
    return (
      <div className="rounded-lg bg-moss-100 p-3 text-sm text-moss-800 dark:bg-moss-900/40 dark:text-moss-200">
        Gemma ready · running locally via WebGPU
      </div>
    )
  }
  if (status === 'loading') {
    return (
      <div className="rounded-lg bg-bark-100 p-3 text-sm text-bark-800 dark:bg-bark-800 dark:text-bark-100">
        Loading Gemma… {Math.round(progress * 100)}%
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        Failed to load Gemma: {error}
        <Button variant="secondary" className="mt-2 w-full" onClick={onWake}>
          Retry
        </Button>
      </div>
    )
  }
  return (
    <Card>
      <p className="mb-2 text-sm text-bark-700 dark:text-bark-200">
        Gemma is asleep. Wake it to start generating quests.
      </p>
      <Button variant="primary" className="w-full" onClick={onWake}>
        Wake Gemma
      </Button>
    </Card>
  )
}

function LockoutBanner({ state }: { state: string }) {
  if (state === 'locked') {
    return (
      <div className="rounded-lg bg-red-100 p-3 text-sm font-medium text-red-900 dark:bg-red-950 dark:text-red-100">
        🔒 Phone locked. Complete your quest or use the panic PIN.
      </div>
    )
  }
  return null
}

function ActiveQuestCard({ questId }: { questId: string }) {
  const navigate = useNavigate()
  return (
    <Card>
      <Timer questId={questId} />
      <Button variant="primary" className="mt-3 w-full" onClick={() => navigate(`/quest/${questId}`)}>
        View quest
      </Button>
    </Card>
  )
}
