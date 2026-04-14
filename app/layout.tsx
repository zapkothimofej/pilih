import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'PILIH — Prompt it like it\'s hot',
  description: '21-Tage KI-Führerschein: Lerne Prompt Engineering für deinen Job.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="de" className={`${geist.variable} h-full`}>
        <body className="min-h-full bg-[#0a0a0a] text-white antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
