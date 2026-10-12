import { Link } from 'react-router-dom'
import { useQuests } from '../app/QuestProvider.js'
import { useGemma } from '../app/GemmaProvider.js'

export function Header() {
  const { activeQuest } = useQuests()
  const { status } = useGemma()

  return (
    <header className="flex items-center justify-between gap-3 border-b border-bark-200/60 px-4 py-3 sm:px-6 dark:border-bark-800">
      <Link to="/" className="flex min-h-11 items-center gap-2" aria-label="OpenQuest home">
        <span className="text-xl">🌿</span>
        <span className="font-semibold tracking-tight text-moss-700 dark:text-moss-300">
          OpenQuest
        </span>
      </Link>
      <div className="flex min-w-0 items-center gap-2 text-xs text-bark-600 dark:text-bark-300">
        {status === 'ready' && <span className="h-2 w-2 rounded-full bg-moss-500" />}
        {status === 'loading' && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
        {status === 'error' && <span className="h-2 w-2 rounded-full bg-red-500" />}
        {activeQuest && <span className="truncate">Quest active</span>}
      </div>
    </header>
  )
}
