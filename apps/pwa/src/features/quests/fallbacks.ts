/**
 * Hardcoded fallback quests used when the LLM is unavailable or fails
 * to generate a valid quest. Imported by questService.
 */

export interface FallbackQuest {
  id: string
  prompt: string
  category: 'park' | 'cafe' | 'viewpoint' | 'historical' | 'bakery' | 'market' | 'garden'
  verificationHint: string
  estimatedWalkMinutes: number
}

export const FALLBACK_QUESTS: FallbackQuest[] = [
  {
    id: 'fallback-park-bench',
    prompt: 'Walk to the nearest public park and photograph a bench with someone (or no one) sitting on it.',
    category: 'park',
    verificationHint: 'A bench in a park setting, made of wood or metal, with grass or trees visible.',
    estimatedWalkMinutes: 15,
  },
  {
    id: 'fallback-cafe-sign',
    prompt: 'Find an independent coffee shop and photograph its exterior sign.',
    category: 'cafe',
    verificationHint: 'A storefront sign with the cafe name, ideally showing the entrance.',
    estimatedWalkMinutes: 10,
  },
  {
    id: 'fallback-viewpoint',
    prompt: 'Walk to the highest point within 2 km and photograph the view.',
    category: 'viewpoint',
    verificationHint: 'A wide-angle view from an elevated position, showing rooftops or horizon.',
    estimatedWalkMinutes: 25,
  },
  {
    id: 'fallback-historical-marker',
    prompt: 'Find a historical marker or plaque and photograph it.',
    category: 'historical',
    verificationHint: 'A metal or stone plaque with text, mounted on a post or wall.',
    estimatedWalkMinutes: 20,
  },
  {
    id: 'fallback-bakery-bread',
    prompt: 'Visit a bakery and photograph a loaf of bread on the shelf.',
    category: 'bakery',
    verificationHint: 'Bread loaves displayed in a bakery setting.',
    estimatedWalkMinutes: 12,
  },
  {
    id: 'fallback-market-produce',
    prompt: 'Walk to an outdoor market and photograph a pile of fresh produce.',
    category: 'market',
    verificationHint: 'Fresh fruit or vegetables arranged on a market stall.',
    estimatedWalkMinutes: 18,
  },
  {
    id: 'fallback-garden-flower',
    prompt: 'Find a community garden and photograph a single flower in bloom.',
    category: 'garden',
    verificationHint: 'A flower in a garden setting, with greenery visible around it.',
    estimatedWalkMinutes: 22,
  },
]
