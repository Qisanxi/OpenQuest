/**
 * Photo judging prompt.
 *
 * Gemma receives:
 *   - The original quest prompt and verification hint
 *   - The candidate photo
 *   - GPS proximity info (was the photo taken within the quest radius?)
 *
 * It returns:
 *   - passed: boolean
 *   - reason: short explanation (1 sentence)
 *   - observations: array of 1-3 things the model noticed in the photo
 *
 * The model's verdict is advisory — if GPS proximity check FAILED, we
 * override to fail regardless of what the model says. The model can
 * hallucinate that a photo matches when it doesn't; GPS doesn't lie.
 */

import type { Quest } from '@shared/quest'
import type { ChatMessage } from '../../lib/gemma/client.js'

export const JUDGE_SYSTEM_PROMPT = `You are OpenQuest's photo judge. You decide if a photo completes a quest.

Hard rules:
1. Look at the photo carefully. Does it show what the quest prompt asked for?
2. Use the verification hint as a guide — does the photo match the hint?
3. Be lenient on photo quality (lighting, framing, focus). Be strict on subject.
4. NEVER pass a photo that shows something dangerous or illegal.
5. If you can't tell, return passed=false with reason "could not verify".

Output: a JSON object with this exact shape:
{
  "passed": boolean,
  "reason": "one short sentence explaining your decision",
  "observations": ["observation 1", "observation 2"]
}

Output ONLY the JSON. No prose, no markdown fences.`

export function buildJudgeUserPrompt(quest: Quest, gpsProximity: 'within' | 'outside' | 'unknown'): string {
  return `Quest prompt: ${quest.prompt}
Verification hint: ${quest.verificationHint}
Place name: ${quest.placeName}
Category: ${quest.category}
GPS proximity: ${gpsProximity === 'within' ? 'photo was taken within the quest radius' : gpsProximity === 'outside' ? 'photo was taken OUTSIDE the quest radius (this should bias you toward fail unless the photo clearly matches)' : 'GPS unavailable'}

Does the attached photo complete the quest?`
}

export function buildJudgeMessages(quest: Quest, gpsProximity: 'within' | 'outside' | 'unknown'): ChatMessage[] {
  return [
    { role: 'system', content: JUDGE_SYSTEM_PROMPT },
    { role: 'user', content: buildJudgeUserPrompt(quest, gpsProximity) },
  ]
}
