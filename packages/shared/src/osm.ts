/**
 * OpenStreetMap Overpass API types — used by the PWA to fetch candidate
 * POIs (points of interest) around the user's location for quest generation.
 *
 * We use Overpass QL (a query language) to ask for tagged nodes within
 * a radius. Results are filtered to outdoor-relevant POIs.
 */

import type { QuestCategory } from './quest.js'

export interface OverpassNode {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags: Record<string, string>
}

export interface OverpassWay {
  type: 'way'
  id: number
  nodes: number[]
  geometry?: { lat: number; lon: number }[]
  tags: Record<string, string>
  center?: { lat: number; lon: number }
}

export type OverpassElement = OverpassNode | OverpassWay

export interface OverpassResponse {
  version: number
  generator: string
  elements: OverpassElement[]
}

/**
 * Maps OSM tags to OpenQuest quest categories. The order matters —
 * the first matching rule wins.
 */
export const OSM_TAG_RULES: ReadonlyArray<{ tags: Record<string, string[]>, category: QuestCategory }> = [
  { tags: { leisure: ['park', 'garden', 'greenhouse'] }, category: 'park' },
  { tags: { leisure: ['pitch', 'playground'] }, category: 'park' },
  { tags: { amenity: ['cafe'] }, category: 'cafe' },
  { tags: { amenity: ['bakery', 'fast_food'] }, category: 'bakery' },
  { tags: { amenity: ['marketplace'] }, category: 'market' },
  { tags: { shop: ['bakery', 'greengrocer', 'marketplace'] }, category: 'market' },
  { tags: { tourism: ['viewpoint'] }, category: 'viewpoint' },
  { tags: { tourism: ['artwork', 'mural'] }, category: 'street_art' },
  { tags: { historic: ['memorial', 'monument', 'plaques', 'wayside_cross'] }, category: 'historical' },
  { tags: { historic: ['wayside_shrine', 'tomb'] }, category: 'historical' },
  { tags: { tourism: ['attraction', 'museum', 'gallery'] }, category: 'landmark' },
  { tags: { natural: ['beach', 'peak', 'cliff', 'cave_entrance'] }, category: 'viewpoint' },
  { tags: { natural: ['spring', 'waterfall'] }, category: 'water' },
  { tags: { waterway: ['waterfall', 'rapids'] }, category: 'water' },
  { tags: { leisure: ['community_centre'] }, category: 'garden' },
]

export interface PoiFilter {
  /** Categories to include (others are filtered out). */
  categories?: QuestCategory[]
  /** Maximum walking distance in meters from the user. */
  maxDistanceMeters?: number
  /** Maximum number of POIs to return. */
  limit?: number
}

export interface RankedPoi {
  osmId: string
  name: string
  category: QuestCategory
  lat: number
  lng: number
  distanceMeters: number
  /** Composite score: closer + more interesting = higher. */
  score: number
}
