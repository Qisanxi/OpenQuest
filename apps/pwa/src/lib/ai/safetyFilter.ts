/**
 * Quest safety filter.
 *
 * The LLM is constrained by the prompt, but we run a hard regex net over
 * its output before showing the quest to the user. Any match rejects the
 * quest and triggers a fallback.
 *
 * Categories of rejection:
 *   1. Trespassing — "climb over", "private property", "enter the yard"
 *   2. Traffic danger — "stand in the road", "cross the highway"
 *   3. Water hazard — "swim", "wade", "cross the river"
 *   4. Heights — "climb", "scale", "ledge", "rooftop"
 *   5. Animal handling — "catch", "pet", "feed the", "approach the deer"
 *   6. Foraging — "eat", "taste", "harvest", "pick and eat"
 *   7. Strangers — "ask a stranger", "follow someone", "photograph a person"
 *   8. Abstract / non-photo-checkable — "feel", "essence", "spirit of"
 */

export interface SafetyResult {
  safe: boolean
  reason?: string
  matchedPhrase?: string
}

const UNSAFE_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  // Trespassing
  { pattern: /\b(climb over|jump the fence|private property|enter(?:ing)? (?:the )?yard|trespass)/i, reason: 'trespassing' },
  // Traffic
  { pattern: /\b(stand in (?:the )?road|cross the highway|walk on (?:the )?freeway|interstate)/i, reason: 'traffic_danger' },
  // Water
  { pattern: /\b(swim|wade|cross the river|enter(?:ing)? the water|dive in)/i, reason: 'water_hazard' },
  // Heights
  { pattern: /\b(climb(?:ing)?|scale(?:ing)?|ledge|rooftop|parapet|balcony railing)/i, reason: 'height_hazard' },
  // Animals
  { pattern: /\b(catch(?:ing)?|pet(?:ting)?|feed the|approach the (?:deer|dog|cat|bird|raccoon|squirrel))/i, reason: 'animal_handling' },
  // Foraging
  { pattern: /\b(eat|taste|harvest|pick and eat|consume|ingest)/i, reason: 'foraging' },
  // Strangers
  { pattern: /\b(ask a stranger|follow someone|photograph (?:a|the) person|knock on doors)/i, reason: 'stranger_danger' },
  // Abstract / non-physical
  { pattern: /\b(feel(?:ing)? the|essence|spirit of|aura of|vibe of|shimmer|whisper of)/i, reason: 'abstract_unverifiable' },
  // Self-harm
  { pattern: /\b(cut yourself|hurt yourself|self[- ]harm)/i, reason: 'self_harm' },
  // Illegal
  { pattern: /\b(steal|shoplift|vandalize|break in|trespass)/i, reason: 'illegal' },
]

const ABSTRACT_KEYWORDS = [
  'breeze', 'shimmer', 'essence', 'spirit', 'aura', 'vibe',
  'whisper of', 'feeling of', 'sense of', 'energy of',
]

export function isSafeQuest(prompt: string): SafetyResult {
  for (const { pattern, reason } of UNSAFE_PATTERNS) {
    const match = prompt.match(pattern)
    if (match) {
      return { safe: false, reason, matchedPhrase: match[0] }
    }
  }
  return { safe: true }
}

export function isPlain(prompt: string): SafetyResult {
  const lower = prompt.toLowerCase()
  for (const word of ABSTRACT_KEYWORDS) {
    if (lower.includes(word)) {
      return { safe: false, reason: 'abstract_unverifiable', matchedPhrase: word }
    }
  }
  return { safe: true }
}

export function checkQuest(prompt: string): SafetyResult {
  const safety = isSafeQuest(prompt)
  if (!safety.safe) return safety
  return isPlain(prompt)
}
