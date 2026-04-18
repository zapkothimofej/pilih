import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: {
    default: 'PILIH — Prompt it like it\'s hot',
    template: '%s · PILIH',
  },
  description: '21-Tage KI-Führerschein: Lerne Prompt Engineering für deinen Job.',
  openGraph: {
    title: 'PILIH — Prompt it like it\'s hot',
    description: 'Dein persönlicher KI-Führerschein in 21 Tagen.',
    type: 'website',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PILIH — Prompt it like it\'s hot',
    description: 'Dein persönlicher KI-Führerschein in 21 Tagen.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#18191d',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
