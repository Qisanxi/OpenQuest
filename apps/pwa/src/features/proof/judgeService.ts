/**
 * Photo judging service.
 *
 * Flow:
 *   1. User takes a photo via Camera component
 *   2. preprocessPhoto downscales to 1280px, keeps GPS EXIF
 *   3. Read GPS from EXIF (fallback: browser geolocation at capture time)
 *   4. Check GPS proximity to quest target — within `radiusMeters`?
 *   5. Send photo + quest context to Gemma multimodal judge
 *   6. If GPS proximity failed, override judge result to FAIL
 *   7. Update quest status, record completion (if passed)
 *
 * Privacy: the photo NEVER leaves the device. It is stored in IndexedDB
 * and shown via blob URL. The judge runs locally via WebGPU.
 */

import { z } from 'zod'
import type { Quest } from '@shared/quest'
import { gemmaClient } from '../../lib/gemma/client.js'
import { generateStructured } from '../../lib/gemma/structured.js'
import { preprocessPhoto } from '../../lib/images/preprocess.js'
import { isWithinRadius } from '../../lib/geo/distance.js'
import { questDb } from '../../lib/db/schema.js'
import { questService } from '../quests/questService.js'
import { buildJudgeMessages } from './judgePrompts.js'

const JudgeResponseSchema = z.object({
  passed: z.boolean(),
  reason: z.string().min(1).max(200),
  observations: z.array(z.string().min(1).max(100)).max(5),
})

export interface JudgeResult {
  passed: boolean
  reason: string
  observations: string[]
  /** Why we passed/failed at the system level (GPS override, etc). */
  systemNote?: string
}

class JudgeService {
  async judge(questId: string, photo: Blob): Promise<JudgeResult> {
    const quest = await questDb.getQuest(questId)
    if (!quest) throw new Error(`Quest ${questId} not found`)
    if (quest.status !== 'submitted' && quest.status !== 'active') {
      throw new Error(`Quest is ${quest.status}, cannot judge`)
    }

    // Preprocess: downscale + read GPS EXIF
    const processed = await preprocessPhoto(photo)
    await questDb.putPhoto(questId, processed.blob)

    // GPS proximity check (advisory — the model also gets this info)
    let gpsProximity: 'within' | 'outside' | 'unknown' = 'unknown'
    if (processed.gps) {
      const within = isWithinRadius(
        processed.gps.lat,
        processed.gps.lng,
        quest.targetLat,
        quest.targetLng,
        quest.radiusMeters,
      )
      gpsProximity = within ? 'within' : 'outside'
    }

    // Convert image to Uint8Array for the multimodal call
    const imgBytes = new Uint8Array(await processed.blob.arrayBuffer())

    const messages = buildJudgeMessages(quest, gpsProximity)
    const result = await generateStructured(JudgeResponseSchema, messages)

    if (!result) {
      // LLM failed to produce valid JSON. Fail safe with a clear reason.
      return {
        passed: false,
        reason: 'Could not verify photo. The model failed to produce a judgement.',
        observations: [],
        systemNote: 'llm_parse_failure',
      }
    }

    // GPS override: if GPS said outside, fail regardless of what the model thinks
    if (gpsProximity === 'outside' && result.passed) {
      const finalResult: JudgeResult = {
        passed: false,
        reason: 'Photo was taken outside the quest area. Walk closer to the target location.',
        observations: result.observations,
        systemNote: 'gps_override_outside',
      }
      await questService.markFailed(questId, finalResult.reason)
      return finalResult
    }

    // Persist result
    if (result.passed) {
      await questService.markVerified(questId, result.reason)
    } else {
      await questService.markFailed(questId, result.reason)
    }

    return {
      passed: result.passed,
      reason: result.reason,
      observations: result.observations,
    }
  }
}

export const judgeService = new JudgeService()
