'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            🔥 <span className="text-orange-500">PILIH</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">Dein KI-Führerschein in 21 Tagen</p>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
