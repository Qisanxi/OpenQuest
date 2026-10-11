import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'
import { sanitizePlaceName, PLACE_NAME_MAX } from '@shared/quest'

const QUICK_PLACES = [
  'Brooklyn',
  'downtown',
  'the river',
  'a residential street',
  'near the park',
  'old town',
]

export function LocationPicker() {
  const navigate = useNavigate()
  const [place, setPlace] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Where are you?</h2>

      <Card>
        <p className="mb-3 text-sm text-bark-700 dark:text-bark-200">
          OpenQuest does NOT track your GPS. This text is just a hint for the
          model to flavour your quests — type as much or as little as you like.
        </p>

        <input
          type="text"
          value={place}
          maxLength={PLACE_NAME_MAX}
          placeholder="e.g. Brooklyn, or 'near the river'"
          onChange={(e) => setPlace(sanitizePlaceName(e.target.value))}
          className="w-full rounded-lg border border-bark-200 bg-white px-3 py-2 text-sm dark:border-bark-700 dark:bg-bark-900"
        />
        <div className="mt-1 text-right text-xs text-bark-500">
          {place.length}/{PLACE_NAME_MAX}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PLACES.map((p) => (
            <button
              key={p}
              onClick={() => setPlace(p)}
              className="rounded-full bg-bark-100 px-3 py-1 text-xs text-bark-800 hover:bg-bark-200 dark:bg-bark-800 dark:text-bark-100"
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          className="mt-4 w-full"
          onClick={() => {
            // Stash in localStorage so the quest generator picks it up next time
            localStorage.setItem('openquest.place', place)
            navigate('/')
          }}
        >
          Save & continue
        </Button>
      </Card>

      <p className="text-xs text-bark-500">
        Why no GPS? OpenQuest fetches nearby POIs from OpenStreetMap to generate
        quests — but the *place name* you type here is just for the LLM's prompt
        flavour. Your actual coordinates are used only in-memory for proximity
        checks and never stored or uploaded.
      </p>
    </div>
  )
}
