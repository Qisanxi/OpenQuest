import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { gemmaClient, type GemmaStatus } from '../lib/gemma/client.js'

interface GemmaContextValue {
  status: GemmaStatus
  loadProgress: number  // 0..1
  error: string | null
  wake: () => Promise<void>
}

const GemmaContext = createContext<GemmaContextValue | null>(null)

export function GemmaProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GemmaStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = gemmaClient.onStatus((s) => setStatus(s))
    const unsubProgress = gemmaClient.onProgress((p) => setLoadProgress(p))
    return () => {
      unsub()
      unsubProgress()
    }
  }, [])

  async function wake() {
    try {
      setError(null)
      setStatus('loading')
      await gemmaClient.load()
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <GemmaContext.Provider value={{ status, loadProgress, error, wake }}>
      {children}
    </GemmaContext.Provider>
  )
}

export function useGemma() {
  const ctx = useContext(GemmaContext)
  if (!ctx) throw new Error('useGemma must be used inside a GemmaProvider')
  return ctx
}
