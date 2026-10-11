import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Quest } from '@shared/quest'
import { questService } from '../features/quests/questService.js'
import { questDb } from '../lib/db/schema.js'

interface QuestContextValue {
  activeQuest: Quest | null
  recentQuests: Quest[]
  generating: boolean
  generate: () => Promise<void>
  accept: (questId: string) => Promise<void>
  abandon: (questId: string) => Promise<void>
  submitPhoto: (questId: string, photoBlob: Blob) => Promise<void>
}

const QuestContext = createContext<QuestContextValue | null>(null)

export function QuestProvider({ children }: { children: ReactNode }) {
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [recentQuests] = useState<Quest[]>([])
  const [generating, setGenerating] = useState(false)

  // Restore the in-progress quest after a reload / PWA relaunch, and expire
  // quests whose hour has run out (otherwise the UI shows "no active quest"
  // while the lockout is still running).
  useEffect(() => {
    let cancelled = false
    async function sync() {
      await questService.expireOldQuests()
      const open = await questDb.listOpen()
      if (cancelled) return
      // Never clobber a quest the user is looking at that isn't "open" yet/any more:
      // 'pending' = offered but not accepted, 'submitted' = being judged right now.
      setActiveQuest((prev) =>
        open[0] ?? (prev && (prev.status === 'pending' || prev.status === 'submitted') ? prev : null),
      )
    }
    sync()
    const id = setInterval(sync, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  async function generate() {
    setGenerating(true)
    try {
      const quest = await questService.generateQuest()
      setActiveQuest(quest)
    } finally {
      setGenerating(false)
    }
  }

  async function accept(questId: string) {
    const quest = await questService.acceptQuest(questId)
    setActiveQuest(quest)
  }

  async function abandon(questId: string) {
    await questService.abandonQuest(questId)
    setActiveQuest(null)
  }

  async function submitPhoto(questId: string, photoBlob: Blob) {
    const quest = await questService.submitPhoto(questId, photoBlob)
    setActiveQuest(quest)
  }

  return (
    <QuestContext.Provider
      value={{ activeQuest, recentQuests, generating, generate, accept, abandon, submitPhoto }}
    >
      {children}
    </QuestContext.Provider>
  )
}

export function useQuests() {
  const ctx = useContext(QuestContext)
  if (!ctx) throw new Error('useQuests must be used inside a QuestProvider')
  return ctx
}
