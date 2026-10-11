import { Header } from '../components/Header.js'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <Header />
      <main className="flex-1 px-4 py-6">{children}</main>
      <footer className="px-4 py-3 text-center text-xs text-bark-500">
        OpenQuest · open-source · runs on your device
      </footer>
    </div>
  )
}
