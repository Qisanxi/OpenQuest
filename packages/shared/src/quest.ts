/**
 * Quest domain types — shared between PWA, companion, and worker.
 *
 * A quest is a small real-world mission: walk to a place, photograph
 * something specific, return. The LLM generates the prompt; OSM POI
 * data fills in the location; the photo judge verifies completion.
 */

export type QuestCategory =
  | 'park'
  | 'cafe'
  | 'viewpoint'
  | 'historical'
  | 'bakery'
  | 'market'
  | 'garden'
  | 'landmark'
  | 'water'
  | 'street_art'

export type QuestStatus =
  | 'pending'    // generated, not yet accepted by user
  | 'active'     // user accepted, lockout engaged, walking
  | 'submitted'  // photo submitted, awaiting judgement
  | 'verified'   // judged passed
  | 'failed'     // judged failed
  | 'expired'    // hour ran out without submission
  | 'abandoned'  // user gave up via panic PIN

export type Setting = 'city' | 'suburb' | 'park' | 'countryside' | 'beach' | 'desert'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'

export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy'

/**
 * Free-text + categorical context injected into the quest generation prompt.
 * The `placeName` is a 60-char user-typed string (NOT geolocation) — kept
 * vague on purpose so the LLM has something to flavour the quest with
 * without us tracking the user's actual coordinates for prompt-building.
 */
export interface QuestContext {
  setting: Setting
  season: Season
  time: TimeOfDay
  weather: Weather
  placeName?: string  // optional, user-supplied, capped at 60 chars
}

export interface Quest {
  id: string                 // UUID
  prompt: string             // What the user must do — natural language
  category: QuestCategory
  verificationHint: string   // What the judge should look for in the photo
  placeName: string          // POI name from OSM
  placeId?: string           // OSM osm_id
  targetLat: number
  targetLng: number
  estimatedWalkMinutes: number
  radiusMeters: number        // accepted proximity for GPS verification
  durationMinutes: number    // how long the lockout lasts (default 60)
  context: QuestContext
  status: QuestStatus
  createdAt: number
  acceptedAt?: number
  submittedAt?: number
  verifiedAt?: number
  photoUrl?: string           // blob URL after capture, never uploaded
  judgeReason?: string       // LLM explanation on pass/fail
}

export interface QuestGenerationRequest {
  context: QuestContext
  /** POIs returned by Overpass, candidate locations for the quest. */
  candidates: QuestCandidate[]
  /** Recently-used quest prompts — the LLM must avoid these. */
  avoidPrompts: string[]
}

export interface QuestCandidate {
  osmId: string
  name: string
  category: QuestCategory
  lat: number
  lng: number
  distanceMeters: number
}

export interface QuestGenerationResponse {
  prompt: string
  category: QuestCategory
  verificationHint: string
  placeName: string
  placeId: string
  estimatedWalkMinutes: number
}

export const PLACE_NAME_MAX = 60

export function sanitizePlaceName(input: string): string {
  return input.trim().slice(0, PLACE_NAME_MAX)
}

export function isQuestExpired(quest: Quest, now: number = Date.now()): boolean {
  if (quest.status !== 'active' || !quest.acceptedAt) return false
  return now - quest.acceptedAt > quest.durationMinutes * 60 * 1000
}
