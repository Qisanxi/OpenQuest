import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLockout } from '../../app/LockoutProvider.js'
import { useQuests } from '../../app/QuestProvider.js'
import { questDb } from '../../lib/db/schema.js'
import { categoryMeta } from '../../lib/osm/categories.js'
import { bearing, compassDirection, haversine } from '../../lib/geo/distance.js'
import type { Quest } from '@shared/quest'
import { Button } from '../../components/Button.js'
import { Card } from '../../components/Card.js'

export function QuestCard() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { activeQuest, accept, abandon } = useQuests()
  const { lock, state: lockoutState } = useLockout()
  const [quest, setQuest] = useState<Quest | null>(activeQuest)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (questId && (!quest || quest.id !== questId)) {
      questDb.getQuest(questId).then((q) => q && setQuest(q))
    }
  }, [questId, quest])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const watch = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [])

  if (!quest) {
    return <div className="p-4 text-sm text-bark-600">Loading quest…</div>
  }

  const meta = categoryMeta(quest.category)

  async function onAccept() {
    if (!quest) return
    await accept(quest.id)
    await lock(quest.id, quest.prompt.slice(0, 60), quest.durationMinutes)
    setQuest({ ...quest, status: 'active', acceptedAt: Date.now() })
  }

  async function onAbandon() {
    if (!quest) return
    await abandon(quest.id)
    navigate('/quests')
  }

  const distance = userPos
    ? haversine(userPos.lat, userPos.lng, quest.targetLat, quest.targetLng)
    : null
  const direction = userPos
    ? `${compassDirection(bearing(userPos.lat, userPos.lng, quest.targetLat, quest.targetLng))}`
    : null

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-start gap-3">
          <span className="text-3xl">{meta.emoji}</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-moss-800 dark:text-moss-200">
              {quest.placeName}
            </h2>
            <p className="text-xs text-bark-600 dark:text-bark-300">
              {meta.label} · ~{quest.estimatedWalkMinutes} min walk
            </p>
          </div>
          {quest.status === 'active' && (
            <span className="rounded bg-moss-600 px-2 py-1 text-xs font-medium text-white">
              Active
            </span>
          )}
        </div>

        <p className="mb-4 text-sm text-bark-800 dark:text-bark-100">{quest.prompt}</p>

        {distance != null && (
          <div className="mb-3 rounded-lg bg-bark-50 p-3 text-sm dark:bg-bark-900">
            <div className="flex justify-between">
              <span className="text-bark-700 dark:text-bark-200">Distance</span>
              <span className="font-medium">{Math.round(distance)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bark-700 dark:text-bark-200">Head</span>
              <span className="font-medium">{direction}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {quest.status === 'pending' && (
            <Button variant="primary" className="flex-1" onClick={onAccept}>
              Accept & lock phone
            </Button>
          )}
          {quest.status === 'active' && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate(`/quest/${quest.id}/camera`)}
            >
              Take photo
            </Button>
          )}
          <Button variant="secondary" onClick={onAbandon}>
            Abandon
          </Button>
        </div>
      </Card>

      {quest.status === 'active' && lockoutState === 'locked' && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
          🔒 Phone locked. Other apps have no internet. Complete the quest to unlock.
        </div>
      )}
    </div>
  )
}
