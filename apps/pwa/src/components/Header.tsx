import { useQuests } from '../app/QuestProvider.js'
import { useGemma } from '../app/GemmaProvider.js'

export function Header() {
  const { activeQuest } = useQuests()
  const { status } = useGemma()

  return (
    <header className="flex items-center justify-between border-b border-bark-200/60 px-4 py-3 dark:border-bark-800">
      <div className="flex items-center gap-2">
        <span className="text-xl">🌿</span>
        <span className="font-semibold tracking-tight text-moss-700 dark:text-moss-300">
          OpenQuest
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-bark-600 dark:text-bark-300">
        {status === 'ready' && <span className="h-2 w-2 rounded-full bg-moss-500" />}
        {status === 'loading' && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
        {status === 'error' && <span className="h-2 w-2 rounded-full bg-red-500" />}
        {activeQuest && <span>·</span>}
        {activeQuest && <span>Quest active</span>}
      </div>
    </header>
  )
}
