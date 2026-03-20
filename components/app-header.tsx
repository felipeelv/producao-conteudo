'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/calendario': 'Calendário',
  '/cadastro': 'Cadastro JSON',
  '/controle': 'Controle de Produção',
  '/kanban': 'Kanban'
}

export function AppHeader() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Controle de Produção'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
    </header>
  )
}
