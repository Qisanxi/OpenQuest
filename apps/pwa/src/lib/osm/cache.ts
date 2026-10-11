/**
 * IndexedDB cache for Overpass responses.
 *
 * Key: `${lat.toFixed(4)},${lng.toFixed(4)},${radiusMeters}`
 * Value: OverpassElement[]
 * TTL: 7 days
 *
 * Why IndexedDB not localStorage:
 *   - POI payloads can be ~200KB+ (200 nodes with tags)
 *   - localStorage has 5MB total cap and blocks the main thread
 *   - IndexedDB is async and can hold hundreds of MB
 */

import { openDB, type IDBPDatabase } from 'idb'
import type { OverpassElement } from '@shared/osm'

const DB_NAME = 'openquest-osm'
const STORE = 'pois'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

let dbPromise: Promise<IDBPDatabase> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

interface CacheEntry {
  elements: OverpassElement[]
  fetchedAt: number
}

export const overpassCache = {
  async get(key: string): Promise<OverpassElement[] | null> {
    const d = await db()
    const entry = (await d.get(STORE, key)) as CacheEntry | undefined
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > TTL_MS) {
      await d.delete(STORE, key)
      return null
    }
    return entry.elements
  },

  async set(key: string, elements: OverpassElement[]): Promise<void> {
    const d = await db()
    await d.put(STORE, { elements, fetchedAt: Date.now() } satisfies CacheEntry, key)
  },

  async clear(): Promise<void> {
    const d = await db()
    await d.clear(STORE)
  },

  async size(): Promise<number> {
    const d = await db()
    return await d.count(STORE)
  },
}
