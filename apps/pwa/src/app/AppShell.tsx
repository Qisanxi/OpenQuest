import { Header } from '../components/Header.js'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-xl lg:max-w-2xl">
      <Header />
      <main className="flex-1 px-4 py-6 sm:px-6 md:py-10">{children}</main>
      <footer className="px-4 py-4 text-center text-xs text-bark-500">
        OpenQuest · open-source · runs on your device
      </footer>
    </div>
  )
}
