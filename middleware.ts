import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TESTING MODE — Clerk deaktiviert. Pass-through für alle Routen.
// TODO: Ersetzen durch clerkMiddleware() aus @clerk/nextjs/server sobald echte Clerk-Keys konfiguriert sind.
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
