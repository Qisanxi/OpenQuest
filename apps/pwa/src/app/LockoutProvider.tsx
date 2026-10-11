import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { companionBridge, type LockoutState } from '../features/lockout/companionBridge.js'

interface LockoutContextValue {
  state: LockoutState
  companionInstalled: boolean
  lock: (questId: string, summary: string, durationMin?: number) => Promise<void>
  unlock: (reason: 'quest_completed' | 'quest_expired' | 'panic_pin') => Promise<void>
  refresh: () => Promise<void>
}

const LockoutContext = createContext<LockoutContextValue | null>(null)

export function LockoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockoutState>('unlocked')
  const [companionInstalled, setCompanionInstalled] = useState(false)

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [])

  async function refresh() {
    const status = await companionBridge.getStatus()
    if (status) {
      setCompanionInstalled(true)
      setState(status.state)
    } else {
      setCompanionInstalled(false)
      setState('unlocked')
    }
  }

  async function lock(questId: string, summary: string, durationMin = 60) {
    await companionBridge.lock(questId, summary, durationMin)
    await refresh()
  }

  async function unlock(reason: 'quest_completed' | 'quest_expired' | 'panic_pin') {
    await companionBridge.unlock(reason)
    await refresh()
  }

  return (
    <LockoutContext.Provider value={{ state, companionInstalled, lock, unlock, refresh }}>
      {children}
    </LockoutContext.Provider>
  )
}

export function useLockout() {
  const ctx = useContext(LockoutContext)
  if (!ctx) throw new Error('useLockout must be used inside a LockoutProvider')
  return ctx
}
