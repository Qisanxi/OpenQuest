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
  { pattern: /\b(?:climb over|jump the fence|private property|enter(?:ing)? (?:the )?yard|trespass(?:es|ed|ing)?)\b/i, reason: 'trespassing' },
  // Traffic
  { pattern: /\b(?:stand in (?:the )?road|cross the highway|walk on (?:the )?freeway|interstate)\b/i, reason: 'traffic_danger' },
  // Water
  { pattern: /\b(?:swim(?:s|ming)?|swam|swimmers?|wad(?:e|es|ed|ing)|cross(?:es|ed|ing)? the river|enter(?:s|ed|ing)? the water|div(?:e|es|ed|ing) in)\b/i, reason: 'water_hazard' },
  // Heights
  { pattern: /\b(?:climb(?:s|ed|ing)?|scal(?:e|es|ed|ing)|ledges?|rooftops?|parapets?|balcony railings?)\b/i, reason: 'height_hazard' },
  // Animals
  { pattern: /\b(?:catch(?:es|ing)?|caught|pet|pets|petting|feed(?:s|ing)? the|approach(?:es|ed|ing)? the (?:deer|dog|cat|bird|raccoon|squirrel))\b/i, reason: 'animal_handling' },
  // Foraging
  { pattern: /\b(?:eat|eats|eating|ate|tast(?:e|es|ed|ing)|harvest(?:s|ed|ing)?|pick(?:s|ed|ing)? and eat|consum(?:e|es|ed|ing)|ingest(?:s|ed|ing)?)\b/i, reason: 'foraging' },
  // Strangers
  { pattern: /\b(?:ask a stranger|follow someone|photograph (?:a|the) person|knock on doors)\b/i, reason: 'stranger_danger' },
  // Abstract / non-physical
  { pattern: /\b(feel(?:ing)? the|essence|spirit of|aura of|vibe of|shimmer|whisper of)/i, reason: 'abstract_unverifiable' },
  // Self-harm
  { pattern: /\b(?:cut yourself|hurt yourself|self[- ]harm)\b/i, reason: 'self_harm' },
  // Illegal
  { pattern: /\b(?:steal|steals|stealing|stole|shoplift(?:s|ed|ing)?|vandali[sz](?:e|es|ed|ing)|break(?:s|ing)? in|broke in|trespass(?:es|ed|ing)?)\b/i, reason: 'illegal' },
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
