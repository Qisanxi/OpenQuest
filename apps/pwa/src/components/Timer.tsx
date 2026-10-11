import { useEffect, useState } from 'react'
import { useLockout } from '../app/LockoutProvider.js'
import { questDb } from '../lib/db/schema.js'
import type { Quest } from '@shared/quest'

interface TimerProps {
  questId: string
}

export function Timer({ questId }: TimerProps) {
  const { state: lockoutState } = useLockout()
  const [quest, setQuest] = useState<Quest | null>(null)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    questDb.getQuest(questId).then((q) => q && setQuest(q))
  }, [questId])

  useEffect(() => {
    if (!quest?.acceptedAt) return
    const expiresAt = quest.acceptedAt + quest.durationMinutes * 60 * 1000
    const tick = () => {
      const remaining = expiresAt - Date.now()
      setRemainingMs(Math.max(0, remaining))
      if (remaining <= 0) {
        // Quest expired — the QuestProvider should pick this up via its
        // 5s status poll, but we trigger an explicit refresh here too.
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [quest])

  if (!quest || remainingMs == null) return null
  if (quest.status !== 'active') return null

  const mins = Math.floor(remainingMs / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)
  const isLocked = lockoutState === 'locked'

  return (
    <div
      className={`rounded-lg p-4 text-center ${
        isLocked ? 'bg-red-50 dark:bg-red-950/40' : 'bg-moss-50 dark:bg-moss-900/30'
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-bark-600 dark:text-bark-300">
        {isLocked ? 'Phone locked · time remaining' : 'Time remaining'}
      </div>
      <div className="mt-1 font-mono text-3xl font-bold text-bark-900 dark:text-bark-50">
        {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </div>
    </div>
  )
}
