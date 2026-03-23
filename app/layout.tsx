import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Controle de Produção - Material Didático',
  description: 'Sistema de controle de produção de material didático',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <div className="hidden md:block print-hide"><AppSidebar /></div>
        <div className="md:ml-64 min-h-screen print-main-wrapper">
          <div className="hidden md:block print-hide"><AppHeader /></div>
          <main className="p-0 md:p-6">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
