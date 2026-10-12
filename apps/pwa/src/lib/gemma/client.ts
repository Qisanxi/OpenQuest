/**
 * Promise-based wrapper around the Gemma Web Worker.
 *
 * Provides:
 *   - load() — boot the worker, fetch the ONNX model, attach to WebGPU
 *   - generate(messages) — returns a streamed completion as async iterator
 *   - judge(messages, image) — multimodal call, returns parsed JSON
 *   - onStatus(cb) / onProgress(cb) — subscribe to worker state
 *
 * The worker is a singleton. Re-loading (e.g. after device loss) tears
 * down the existing worker before spawning a fresh one.
 */

import { pickModel, type ModelKey } from './models.js'

export type { GemmaStatus } from './gemma.worker.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type Listener<T> = (payload: T) => void

class GemmaClient {
  private worker: Worker | null = null
  private statusListeners = new Set<Listener<any>>()
  private progressListeners = new Set<Listener<number>>()
  private pending = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void; tokens: string[] }>()

  /** Resolves once the model is loaded and ready; rejects if loading fails. */
  async load(modelKey?: ModelKey): Promise<void> {
    const key = modelKey ?? pickModel()
    if (this.worker) this.worker.terminate()
    this.lastLoadError = null
    const worker = new Worker(new URL('./gemma.worker.ts', import.meta.url), { type: 'module' })
    this.worker = worker
    worker.onmessage = (e: MessageEvent) => this.onMessage(e.data)

    await new Promise<void>((resolve, reject) => {
      const off = this.onStatus((s: string) => {
        if (s === 'ready') { off(); resolve() }
        else if (s === 'error') { off(); reject(new Error(this.lastLoadError ?? 'Gemma failed to load')) }
      })
      worker.onerror = (e) => { off(); reject(new Error(e.message || 'Worker crashed')) }
      worker.postMessage({ type: 'load', model: key })
    })
  }

  private requireWorker(): Worker {
    if (!this.worker) throw new Error('Gemma is not loaded yet — call load() first')
    return this.worker
  }

  async *generate(messages: ChatMessage[]): AsyncIterable<string> {
    const id = crypto.randomUUID()
    const queue: string[] = []
    let done = false
    let error: Error | null = null

    this.pending.set(id, {
      resolve: () => { done = true },
      reject: (e) => { error = e; done = true },
      tokens: queue,
    })

    this.requireWorker().postMessage({ type: 'generate', id, messages })

    while (!done) {
      if (queue.length > 0) {
        yield queue.shift()!
      } else {
        await new Promise((r) => setTimeout(r, 16))
      }
      if (error) throw error
    }
    while (queue.length > 0) yield queue.shift()!
  }

  async judge(messages: ChatMessage[], image: Uint8Array): Promise<string> {
    const id = crypto.randomUUID()
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, tokens: [] })
      this.requireWorker().postMessage({ type: 'judge', id, messages, image })
    })
  }

  onStatus(cb: Listener<any>): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  onProgress(cb: Listener<number>): () => void {
    this.progressListeners.add(cb)
    return () => this.progressListeners.delete(cb)
  }

  private lastLoadError: string | null = null

  private onMessage(data: any) {
    switch (data.type) {
      case 'status':
        this.statusListeners.forEach((cb) => cb(data.status))
        break
      case 'progress':
        this.progressListeners.forEach((cb) => cb(data.progress))
        break
      case 'token':
        this.pending.get(data.id)?.tokens.push(data.token)
        break
      case 'done': {
        const p = this.pending.get(data.id)
        if (p) {
          p.resolve(data.text)
          this.pending.delete(data.id)
        }
        break
      }
      case 'error': {
        if (!data.id) this.lastLoadError = data.message
        const p = this.pending.get(data.id)
        if (p) {
          p.reject(new Error(data.message))
          this.pending.delete(data.id)
        }
        break
      }
    }
  }
}

export const gemmaClient = new GemmaClient()
