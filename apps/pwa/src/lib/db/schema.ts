/**
 * IndexedDB schema for OpenQuest PWA.
 *
 * Stores:
 *   - quests:        full Quest objects, key by id
 *   - photos:        photo blobs, key by questId (one per quest)
 *   - completions:   derived stats (count per day, per category)
 *
 * We use idb (Promise wrapper) for ergonomic async access.
 */

import { openDB, type IDBPDatabase } from 'idb'
import type { Quest } from '@shared/quest'

const DB_NAME = 'openquest'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('quests')) {
          const store = db.createObjectStore('quests', { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('createdAt', 'createdAt')
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos')  // key = questId
        }
        if (!db.objectStoreNames.contains('completions')) {
          db.createObjectStore('completions', { keyPath: 'date' })
        }
      },
    })
  }
  return dbPromise
}

export interface DailyCompletion {
  date: string  // YYYY-MM-DD
  count: number
  categories: Record<string, number>
}

export const questDb = {
  async putQuest(quest: Quest) {
    const d = await db()
    await d.put('quests', quest)
  },

  async getQuest(id: string): Promise<Quest | undefined> {
    const d = await db()
    return d.get('quests', id)
  },

  async listQuests(limit = 20): Promise<Quest[]> {
    const d = await db()
    const all = await d.getAllFromIndex('quests', 'createdAt')
    return all.reverse().slice(0, limit) as Quest[]
  },

  async listActive(): Promise<Quest[]> {
    const d = await db()
    return d.getAllFromIndex('quests', 'status', 'active') as Promise<Quest[]>
  },

  /** Quests still in play: accepted and not finished (a failed attempt may be retried). */
  async listOpen(): Promise<Quest[]> {
    const d = await db()
    const [active, failed] = await Promise.all([
      d.getAllFromIndex('quests', 'status', 'active'),
      d.getAllFromIndex('quests', 'status', 'failed'),
    ])
    return [...active, ...failed] as Quest[]
  },

  async putPhoto(questId: string, blob: Blob) {
    const d = await db()
    await d.put('photos', blob, questId)
  },

  async getPhoto(questId: string): Promise<Blob | undefined> {
    const d = await db()
    return d.get('photos', questId)
  },

  async recordCompletion(quest: Quest) {
    const d = await db()
    const date = new Date(quest.verifiedAt ?? Date.now()).toISOString().slice(0, 10)
    const existing = (await d.get('completions', date)) as DailyCompletion | undefined
    const entry: DailyCompletion = existing ?? { date, count: 0, categories: {} }
    entry.count += 1
    entry.categories[quest.category] = (entry.categories[quest.category] ?? 0) + 1
    await d.put('completions', entry)
  },

  async clearAll() {
    const d = await db()
    await Promise.all([
      d.clear('quests'),
      d.clear('photos'),
      d.clear('completions'),
    ])
  },
}
