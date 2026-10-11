/**
 * OSM tag categorization — duplicates the rules in @shared/osm but with
 * display metadata (icon, label, default radius, typical walk duration).
 *
 * Kept here (not in shared) because it's UI-specific.
 */

import type { QuestCategory } from '@shared/quest'

export interface CategoryMeta {
  label: string
  icon: string  // lucide-react icon name
  defaultRadiusMeters: number
  typicalWalkMinutes: number
  emoji: string
}

export const CATEGORY_META: Record<QuestCategory, CategoryMeta> = {
  park:       { label: 'Park',       icon: 'Trees',      defaultRadiusMeters: 1500, typicalWalkMinutes: 15, emoji: '🌳' },
  cafe:       { label: 'Cafe',       icon: 'Coffee',     defaultRadiusMeters: 1000, typicalWalkMinutes: 10, emoji: '☕' },
  viewpoint:  { label: 'Viewpoint',  icon: 'Mountain',   defaultRadiusMeters: 2500, typicalWalkMinutes: 25, emoji: '🏔️' },
  historical: { label: 'Historical', icon: 'Landmark',   defaultRadiusMeters: 2000, typicalWalkMinutes: 20, emoji: '🏛️' },
  bakery:     { label: 'Bakery',     icon: 'Croissant',  defaultRadiusMeters: 1000, typicalWalkMinutes: 12, emoji: '🥐' },
  market:     { label: 'Market',     icon: 'ShoppingBag', defaultRadiusMeters: 1500, typicalWalkMinutes: 18, emoji: '🥬' },
  garden:     { label: 'Garden',     icon: 'Flower',     defaultRadiusMeters: 1800, typicalWalkMinutes: 22, emoji: '🌷' },
  landmark:   { label: 'Landmark',   icon: 'Building',   defaultRadiusMeters: 2000, typicalWalkMinutes: 20, emoji: '🗿' },
  water:      { label: 'Water',      icon: 'Waves',      defaultRadiusMeters: 2500, typicalWalkMinutes: 25, emoji: '💧' },
  street_art: { label: 'Street Art', icon: 'Palette',   defaultRadiusMeters: 1200, typicalWalkMinutes: 15, emoji: '🎨' },
}

export function categoryMeta(cat: QuestCategory): CategoryMeta {
  return CATEGORY_META[cat] ?? CATEGORY_META.park
}
