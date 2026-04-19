import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

// metadataBase anchors all relative URLs in OG / Twitter cards so
// share previews work in production. Derived from the validated env
// schema; falls back to localhost in dev.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'PILIH — Prompt it like it\'s hot',
    template: '%s · PILIH',
  },
  description: '21-Tage KI-Führerschein: Lerne Prompt Engineering für deinen Job.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PILIH — Prompt it like it\'s hot',
    description: 'Dein persönlicher KI-Führerschein in 21 Tagen.',
    type: 'website',
    locale: 'de_DE',
    url: '/',
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
        {/* closeButton: keyboard users can dismiss without waiting
            for auto-dismiss (WCAG 3.3.4 consistent-assistance). */}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  )
}
