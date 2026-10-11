import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './app/AppShell.js'
import { GemmaProvider } from './app/GemmaProvider.js'
import { LockoutProvider } from './app/LockoutProvider.js'
import { QuestProvider } from './app/QuestProvider.js'
import './styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found in index.html')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <GemmaProvider>
        <LockoutProvider>
          <QuestProvider>
            <AppShell />
          </QuestProvider>
        </LockoutProvider>
      </GemmaProvider>
    </BrowserRouter>
  </StrictMode>,
)
