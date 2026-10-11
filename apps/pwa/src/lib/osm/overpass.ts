/**
 * Overpass API client.
 *
 * Fetches OSM POIs around a given lat/lng within a radius, filtered to
 * outdoor-relevant categories (parks, cafes, viewpoints, historical
 * markers, etc.). Results are post-processed into RankedPoi objects with
 * distance and a composite score.
 *
 * We cache aggressively — see lib/osm/cache.ts — because Overpass is a
 * free service with strict rate limits (2 concurrent requests per IP,
 * ~10000 queries per day). A 7-day cache per (lat,lng,radius) key keeps
 * repeat lookups free.
 */

import type { OverpassResponse, OverpassElement, RankedPoi, PoiFilter } from '@shared/osm'
import { OSM_TAG_RULES } from '@shared/osm'
import type { QuestCategory } from '@shared/quest'
import { overpassCache } from './cache.js'

const DEFAULT_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const TIMEOUT_MS = 15000

export interface OverpassQueryOptions extends PoiFilter {
  lat: number
  lng: number
  radiusMeters?: number
  signal?: AbortSignal
}

export async function fetchPois(opts: OverpassQueryOptions): Promise<RankedPoi[]> {
  const { lat, lng, radiusMeters = 2000, signal } = opts

  // Check cache first
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${radiusMeters}`
  const cached = await overpassCache.get(cacheKey)
  if (cached) return filterAndRank(cached, opts)

  const query = buildOverpassQuery(lat, lng, radiusMeters)
  const endpoint = import.meta.env.VITE_OSM_OVERPASS_ENDPOINT || DEFAULT_ENDPOINT

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  if (signal) signal.addEventListener('abort', () => controller.abort())

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`)
    const json = (await res.json()) as OverpassResponse
    const elements = json.elements.filter((e) => e.tags && (e.tags.name || hasCategory(e)))

    await overpassCache.set(cacheKey, elements)
    return filterAndRank(elements, opts)
  } finally {
    clearTimeout(timeout)
  }
}

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  // Build a query that asks for all POIs of outdoor-relevant categories
  // within the radius. We deliberately over-fetch and filter client-side
  // to keep the query small and Overpass-happy.
  const tagFilters = [
    'leisure= park|garden|pitch|playground|nature_reserve',
    'amenity= cafe|bakery|marketplace',
    'tourism= viewpoint|attraction|museum|gallery|artwork',
    'historic= memorial|monument|wayside_shrine|wayside_cross',
    'natural= beach|peak|cliff|spring|waterfall|cave_entrance',
    'shop= bakery|greengrocer|marketplace',
    'waterway= waterfall',
  ]
  const union = tagFilters
    .map((f) => {
      const [k, vs] = f.split('=')
      return vs.split('|').map((v) => `node["${k}"="${v}"](around:${radiusMeters},${lat},${lng});`).join('')
    })
    .join('')

  return `[out:json][timeout:25];(${union});out tags 200;`
}

function hasCategory(el: OverpassElement): boolean {
  for (const rule of OSM_TAG_RULES) {
    for (const [key, values] of Object.entries(rule.tags)) {
      const tagValue = el.tags[key]
      if (tagValue && values.includes(tagValue)) return true
    }
  }
  return false
}

function categorize(el: OverpassElement): QuestCategory | null {
  for (const rule of OSM_TAG_RULES) {
    for (const [key, values] of Object.entries(rule.tags)) {
      const tagValue = el.tags[key]
      if (tagValue && values.includes(tagValue)) return rule.category
    }
  }
  return null
}

function filterAndRank(elements: OverpassElement[], opts: OverpassQueryOptions): RankedPoi[] {
  const { lat, lng, categories, maxDistanceMeters = 2000, limit = 50 } = opts

  const pois: RankedPoi[] = []
  for (const el of elements) {
    const cat = categorize(el)
    if (!cat) continue
    if (categories && !categories.includes(cat)) continue

    const elLat = el.type === 'node' ? el.lat : el.center?.lat
    const elLng = el.type === 'node' ? el.lon : el.center?.lon
    if (elLat == null || elLng == null) continue

    const dist = haversine(lat, lng, elLat, elLng)
    if (dist > maxDistanceMeters) continue

    const score = scorePoi(dist, el.tags, cat)
    pois.push({
      osmId: `${el.type}/${el.id}`,
      name: el.tags.name || el.tags['name:en'] || 'Unnamed location',
      category: cat,
      lat: elLat,
      lng: elLng,
      distanceMeters: dist,
      score,
    })
  }

  return pois.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Composite score: closer + more interesting tags = higher.
 *   - distance: -1 point per km
 *   - has wikipedia/wikidata link: +5 (well-known, photo-worthy)
 *   - has historic tag: +3
 *   - has tourism tag: +3
 *   - has natural tag: +2
 */
function scorePoi(distMeters: number, tags: Record<string, string>, _cat: QuestCategory): number {
  let score = 10
  score -= distMeters / 1000
  if (tags.wikipedia) score += 5
  if (tags.wikidata) score += 5
  if (tags.historic) score += 3
  if (tags.tourism) score += 3
  if (tags.natural) score += 2
  if (tags.name) score += 1
  return score
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
