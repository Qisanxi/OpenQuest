/**
 * Quest orchestration service.
 *
 * This is the main state machine for OpenQuest quests. It coordinates:
 *   1. Build quest context (setting/season/time/weather/place)
 *   2. Fetch candidate POIs from OSM Overpass
 *   3. Ask the local Gemma model to generate a quest
 *   4. Run safety filter on the output
 *   5. Persist the quest to IndexedDB
 *   6. On accept: ask the lockout companion to lock the phone
 *   7. On photo submission: ask the model to judge it
 *   8. On pass: unlock the phone; on fail: keep locked until expiry
 */

import { z } from 'zod'
import type { Quest, QuestCandidate, QuestContext, QuestGenerationResponse } from '@shared/quest'
import { isQuestExpired } from '@shared/quest'
import { gemmaClient, type ChatMessage } from '../../lib/gemma/client.js'
import { generateStructured } from '../../lib/gemma/structured.js'
import { fetchPois } from '../../lib/osm/overpass.js'
import { categoryMeta } from '../../lib/osm/categories.js'
import { questDb } from '../../lib/db/schema.js'
import { buildContext } from './questContext.js'
import { QUEST_SYSTEM_PROMPT, buildQuestUserPrompt, pickFocus } from './questPrompts.js'
import { checkQuest } from '../../lib/ai/safetyFilter.js'
import { FALLBACK_QUESTS } from './fallbacks.js'

const QuestResponseSchema = z.object({
  prompt: z.string().min(10).max(300),
  category: z.enum([
    'park', 'cafe', 'viewpoint', 'historical', 'bakery',
    'market', 'garden', 'landmark', 'water', 'street_art',
  ]),
  verificationHint: z.string().min(10).max(300),
  placeName: z.string().min(1).max(100),
  placeId: z.string().min(1),
  estimatedWalkMinutes: z.number().int().min(5).max(120),
})

class QuestService {
  async generateQuest(userPlace?: string): Promise<Quest> {
    const context = await buildContext(userPlace)
    const location = await getUserLocation()
    const candidates = await fetchPois({
      lat: location.lat,
      lng: location.lng,
      radiusMeters: 2000,
      limit: 12,
    })

    if (candidates.length === 0) {
      return this.fallbackQuest(context)
    }

    const recentQuests = await questDb.listQuests(10)
    const avoidPrompts = recentQuests.map((q) => q.prompt)

    const messages: ChatMessage[] = [
      { role: 'system', content: QUEST_SYSTEM_PROMPT },
      { role: 'user', content: buildQuestUserPrompt(context, candidates, avoidPrompts) + `\n\nFocus hint: ${pickFocus()}` },
    ]

    const generated = await generateStructured(QuestResponseSchema, messages)

    if (!generated) {
      return this.fallbackQuest(context, candidates[0])
    }

    const safety = checkQuest(generated.prompt)
    if (!safety.safe) {
      return this.fallbackQuest(context, candidates[0])
    }

    const candidate = candidates.find((c) => c.osmId === generated.placeId)
    const target = candidate ?? candidates[0]

    const quest: Quest = {
      id: crypto.randomUUID(),
      prompt: generated.prompt,
      category: generated.category,
      verificationHint: generated.verificationHint,
      placeName: target.name,
      placeId: target.osmId,
      targetLat: target.lat,
      targetLng: target.lng,
      estimatedWalkMinutes: generated.estimatedWalkMinutes,
      radiusMeters: categoryMeta(generated.category).defaultRadiusMeters,
      durationMinutes: 60,
      context,
      status: 'pending',
      createdAt: Date.now(),
    }

    await questDb.putQuest(quest)
    return quest
  }

  async acceptQuest(questId: string): Promise<Quest> {
    const quest = await questDb.getQuest(questId)
    if (!quest) throw new Error(`Quest ${questId} not found`)
    if (quest.status !== 'pending') throw new Error(`Quest is ${quest.status}, cannot accept`)

    quest.status = 'active'
    quest.acceptedAt = Date.now()
    await questDb.putQuest(quest)
    // Lockout bridge is invoked by the provider, not here — keeps the service
    // pure-ish and easier to test.
    return quest
  }

  async submitPhoto(questId: string, photo: Blob): Promise<Quest> {
    const quest = await questDb.getQuest(questId)
    if (!quest) throw new Error(`Quest ${questId} not found`)
    if (quest.status !== 'active') throw new Error(`Quest is ${quest.status}, cannot submit`)

    await questDb.putPhoto(questId, photo)

    quest.status = 'submitted'
    quest.submittedAt = Date.now()
    await questDb.putQuest(quest)

    return quest
  }

  async markVerified(questId: string, reason: string): Promise<Quest> {
    const quest = await questDb.getQuest(questId)
    if (!quest) throw new Error(`Quest ${questId} not found`)

    quest.status = 'verified'
    quest.verifiedAt = Date.now()
    quest.judgeReason = reason
    await questDb.putQuest(quest)
    await questDb.recordCompletion(quest)
    return quest
  }

  async markFailed(questId: string, reason: string): Promise<Quest> {
    const quest = await questDb.getQuest(questId)
    if (!quest) throw new Error(`Quest ${questId} not found`)

    quest.status = 'failed'
    quest.judgeReason = reason
    await questDb.putQuest(quest)
    return quest
  }

  async abandonQuest(questId: string): Promise<void> {
    const quest = await questDb.getQuest(questId)
    if (!quest) return
    quest.status = 'abandoned'
    await questDb.putQuest(quest)
  }

  async expireOldQuests(now: number = Date.now()): Promise<void> {
    const active = await questDb.listActive()
    for (const quest of active) {
      if (isQuestExpired(quest, now)) {
        quest.status = 'expired'
        await questDb.putQuest(quest)
      }
    }
  }

  private async fallbackQuest(context: QuestContext, candidate?: QuestCandidate): Promise<Quest> {
    const template = FALLBACK_QUESTS[Math.floor(Math.random() * FALLBACK_QUESTS.length)]
    const meta = categoryMeta(template.category)
    const lat = candidate?.lat ?? 0
    const lng = candidate?.lng ?? 0
    const placeName = candidate?.name ?? 'a nearby location'

    const quest: Quest = {
      id: crypto.randomUUID(),
      prompt: template.prompt.replace('the nearest public park', placeName),
      category: template.category,
      verificationHint: template.verificationHint,
      placeName,
      placeId: candidate?.osmId,
      targetLat: lat,
      targetLng: lng,
      estimatedWalkMinutes: candidate?.distanceMeters
        ? Math.ceil(candidate.distanceMeters / 1000 / 5 * 60 + 2)
        : template.estimatedWalkMinutes,
      radiusMeters: meta.defaultRadiusMeters,
      durationMinutes: 60,
      context,
      status: 'pending',
      createdAt: Date.now(),
    }

    await questDb.putQuest(quest)
    return quest
  }
}

async function getUserLocation(): Promise<{ lat: number; lng: number }> {
  // Default to a sensible location (NYC) if geolocation is denied.
  // The quest still works — the user just won't get local POIs.
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ lat: 40.7128, lng: -74.006 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 40.7128, lng: -74.006 }),
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

export const questService = new QuestService()
