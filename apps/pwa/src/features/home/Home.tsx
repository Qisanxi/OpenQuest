import { Link } from 'react-router-dom'
import { useQuests } from '../../app/QuestProvider.js'
import { Card } from '../../components/Card.js'

const STEPS = [
  { emoji: '🧭', title: 'Get a quest', body: 'A local AI model reads what is around you and suggests a short outdoor quest, like photographing a bakery’s bread shelf.' },
  { emoji: '🔒', title: 'Phone locks', body: 'Once you accept, the Android companion app cuts your other apps’ internet for an hour. Navigation and emergency calls still work.' },
  { emoji: '📸', title: 'Take the photo', body: 'Walk there and photograph it. The photo’s GPS has to match the place, and the on-device model checks what is in it.' },
  { emoji: '🌿', title: 'Unlock', body: 'Pass and your phone unlocks. If the hour runs out, it unlocks anyway. Nobody gets stuck.' },
]

const PROPERTIES = [
  { emoji: '🧠', title: 'AI runs on your device', body: 'Gemma 4 runs in your browser via WebGPU. No cloud model, no API keys, no per-quest cost.' },
  { emoji: '🔓', title: 'Open source', body: 'Apache 2.0. The lockout logic is a small Android app you can read in an afternoon.' },
  { emoji: '🆘', title: 'Panic PIN', body: 'Set a 4-digit PIN that force-unlocks for 24 hours. It stays in your phone’s keystore.' },
  { emoji: '🛡️', title: 'Safety filter', body: 'Quests that suggest climbing, swimming, trespassing, foraging or approaching strangers are rejected before you see them.' },
  { emoji: '📍', title: 'GPS-checked photos', body: 'The model’s verdict is advisory. A photo taken outside the quest radius fails, whatever the model says.' },
  { emoji: '🔐', title: 'Private by design', body: 'Your coordinates are used in memory for proximity checks and are never stored or uploaded.' },
]

const linkBase =
  'inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg px-5 py-2 text-sm font-medium transition-colors'

export function Home() {
  const { activeQuest } = useQuests()

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="pt-2 text-center sm:pt-6">
        <span className="inline-block rounded-full bg-moss-100 px-3 py-1 text-xs font-medium text-moss-800 dark:bg-moss-900/50 dark:text-moss-200">
          Pre-alpha · Hacktoberfest 2026
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-moss-700 sm:text-5xl dark:text-moss-300">
          OpenQuest
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg text-bark-700 dark:text-bark-200">
          Open-source quests that lock you out until you touch grass.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm text-bark-600 dark:text-bark-300">
          Accept a short outdoor quest, and your phone can’t doomscroll until you’ve done it.
          The AI that writes and checks quests runs on your own device.
        </p>

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {activeQuest ? (
            <Link
              to={`/quest/${activeQuest.id}`}
              className={`${linkBase} bg-moss-600 text-white hover:bg-moss-700 active:bg-moss-800`}
            >
              Continue your quest
            </Link>
          ) : (
            <Link
              to="/quests"
              className={`${linkBase} bg-moss-600 text-white hover:bg-moss-700 active:bg-moss-800`}
            >
              Start a quest
            </Link>
          )}
          <a
            href="https://github.com/Qisanxi/OpenQuest"
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkBase} bg-bark-100 text-bark-900 hover:bg-bark-200 dark:bg-bark-800 dark:text-bark-50 dark:hover:bg-bark-700`}
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="mb-4 text-xl font-semibold text-moss-800 dark:text-moss-200">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>{s.emoji}</span>
                  <h3 className="font-semibold text-bark-900 dark:text-bark-50">
                    <span className="mr-1 text-bark-500">{i + 1}.</span>
                    {s.title}
                  </h3>
                </div>
                <p className="text-sm text-bark-700 dark:text-bark-200">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="props-heading">
        <h2 id="props-heading" className="mb-4 text-xl font-semibold text-moss-800 dark:text-moss-200">
          Why you can trust it
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PROPERTIES.map((p) => (
            <li key={p.title}>
              <Card className="h-full">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>{p.emoji}</span>
                  <h3 className="font-semibold text-bark-900 dark:text-bark-50">{p.title}</h3>
                </div>
                <p className="text-sm text-bark-700 dark:text-bark-200">{p.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-moss-100 p-5 text-center dark:bg-moss-900/40">
        <p className="text-sm text-moss-900 dark:text-moss-100">
          The lockout needs the OpenQuest Android companion app. The web app alone can generate
          and verify quests, but it can’t block other apps.
        </p>
        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/onboarding/install"
            className={`${linkBase} bg-white text-moss-800 hover:bg-moss-50 dark:bg-moss-800 dark:text-moss-50 dark:hover:bg-moss-700`}
          >
            Set up the companion
          </Link>
          <Link
            to="/quests"
            className={`${linkBase} bg-moss-600 text-white hover:bg-moss-700 active:bg-moss-800`}
          >
            Go to quests
          </Link>
        </div>
      </section>
    </div>
  )
}
