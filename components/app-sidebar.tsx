'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, FileJson, CheckSquare, Kanban, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/cadastro', label: 'Cadastro JSON', icon: FileJson },
  { href: '/controle', label: 'Controle de Produção', icon: CheckSquare },
  { href: '/kanban', label: 'Kanban - Conteúdos', icon: Kanban },
  { href: '/kanban-atividades', label: 'Kanban - Caderno de Ativ.', icon: BookOpen },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <Image
          src="/logo.png"
          alt="ELEVE Logo"
          width={32}
          height={32}
          className="flex-shrink-0 w-8 h-8 object-contain"
        />
        <div>
          <h1 className="text-sm font-semibold text-sidebar-foreground">Controle de Produção</h1>
          <p className="text-xs font-medium text-primary">ELEVE</p>
        </div>
      </div>
      
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent p-3">
          <p className="text-xs font-medium text-sidebar-foreground">Sistema de Controle</p>
          <p className="text-xs text-muted-foreground">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
