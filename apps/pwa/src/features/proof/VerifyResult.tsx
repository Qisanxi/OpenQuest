import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLockout } from '../../app/LockoutProvider.js'
import { questDb } from '../../lib/db/schema.js'
import type { Quest } from '@shared/quest'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'

export function VerifyResult() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { unlock, state: lockoutState } = useLockout()
  const [quest, setQuest] = useState<Quest | null>(null)

  useEffect(() => {
    if (questId) questDb.getQuest(questId).then((q) => q && setQuest(q))
  }, [questId])

  if (!quest) return <div className="p-4 text-sm">Loading…</div>

  const passed = quest.status === 'verified'

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 text-center">
          <div className={`text-5xl ${passed ? 'text-moss-600' : 'text-red-500'}`}>
            {passed ? '✓' : '×'}
          </div>
          <h2 className={`mt-2 text-2xl font-bold ${passed ? 'text-moss-700' : 'text-red-700'}`}>
            {passed ? 'Quest complete!' : 'Photo did not pass'}
          </h2>
        </div>

        <p className="mb-3 text-sm text-bark-700 dark:text-bark-200">
          {quest.judgeReason}
        </p>

        {passed && lockoutState !== 'unlocked' && (
          <div className="mb-3 rounded-lg bg-moss-100 p-3 text-sm text-moss-800 dark:bg-moss-900/40 dark:text-moss-200">
            🎉 Phone unlocked. You can use other apps again.
          </div>
        )}

        {!passed && lockoutState === 'locked' && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
            🔒 Phone still locked. Try again or wait for the timer to expire.
          </div>
        )}

        <Button
          variant={passed ? 'primary' : 'secondary'}
          className="w-full"
          onClick={() => navigate('/')}
        >
          Back to quests
        </Button>

        {!passed && lockoutState === 'locked' && (
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => navigate(`/quest/${quest.id}/camera`)}
          >
            Try again
          </Button>
        )}
      </Card>
    </div>
  )
}
