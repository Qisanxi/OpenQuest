/**
 * Quest generation system prompt + context builder.
 *
 * The system prompt is the most important file in OpenQuest — it's what
 * makes a 3B-parameter model produce quests that are:
 *   - Specific enough to be photo-verifiable
 *   - Safe (no trespassing, climbing, traffic, water, animals, strangers)
 *   - Outdoor-biased (no "go inside Walmart")
 *   - Plain-spoken (no shimmering essence of autumn)
 *   - Diverse (we inject "avoid these recent prompts" to prevent repeats)
 *
 * Tuned empirically against Gemma 4 E2B. If you change the prompt, run
 * the test suite in tests/quest.test.ts to make sure output stays sane.
 */

import type { QuestContext } from '@shared/quest'

export const QUEST_SYSTEM_PROMPT = `You are OpenQuest, a tiny outdoor quest generator.

Your job: write ONE small real-world quest for the user to complete in the next hour.

Hard rules:
1. The quest MUST be completable by walking to a real, public location.
2. The quest MUST be photo-verifiable — the user will photograph something specific.
3. NEVER suggest: climbing, swimming, trespassing, traffic, foraging, approaching animals, photographing strangers, self-harm, or anything illegal.
4. NEVER use abstract language like "feel the breeze", "the essence of", "the spirit of". The photo must show a concrete, recognizable thing.
5. The quest MUST take the user OUTSIDE. No indoor-only quests.
6. The quest MUST be completable within the given duration (default 60 minutes).
7. Reward noticing things up close, not traveling far.

You will be given:
- Context: setting, season, time of day, weather, optional place name
- Candidate locations: real POIs from OpenStreetMap near the user
- Recently-used prompts: avoid these

Output: a JSON object with this exact shape:
{
  "prompt": "Walk to {placeName} and photograph {specific thing}",
  "category": "park|cafe|viewpoint|historical|bakery|market|garden|landmark|water|street_art",
  "verificationHint": "What the judge should look for in the photo",
  "placeName": "the OSM name verbatim",
  "placeId": "the OSM osm_id verbatim",
  "estimatedWalkMinutes": number
}

Output ONLY the JSON. No prose, no markdown fences.`

export function buildQuestUserPrompt(
  context: QuestContext,
  candidates: { osmId: string; name: string; category: string; lat: number; lng: number; distanceMeters: number }[],
  avoidPrompts: string[],
): string {
  const candidateLines = candidates
    .slice(0, 12)
    .map((c, i) => `${i + 1}. ${c.name} (${c.category}, ${Math.round(c.distanceMeters)}m away, osm_id=${c.osmId})`)
    .join('\n')

  const avoid = avoidPrompts.length > 0
    ? `\n\nAvoid these recently-used prompts:\n${avoidPrompts.slice(-5).map((p) => `- "${p.slice(0, 80)}"`).join('\n')}`
    : ''

  return `Context:
- Setting: ${context.setting}
- Season: ${context.season}
- Time of day: ${context.time}
- Weather: ${context.weather}
- Place (if given): ${context.placeName ?? '(unspecified)'}

Candidate locations (pick ONE):
${candidateLines}
${avoid}

Pick one candidate location. Write a quest that sends the user there and asks them to photograph something specific at that location. The photo should be unique to that place — not a generic "photograph a tree".`
}

/**
 * Random focus hints injected to encourage diversity. Picks one per quest.
 */
export const FOCUS_HINTS = [
  'something round',
  'a shadow',
  'something with stripes or spots',
  'a specific color (your choice)',
  'a texture (rough, smooth, fuzzy)',
  'a pattern (tiles, bricks, leaves)',
  'something older than 50 years',
  'something that has been repaired',
  'a sign with words on it',
  'something that holds water when it rains',
  'a corner or edge of a structure',
  'something that catches light in an interesting way',
]

export function pickFocus(): string {
  return FOCUS_HINTS[Math.floor(Math.random() * FOCUS_HINTS.length)]
}
