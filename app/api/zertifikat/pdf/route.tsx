import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/utils/rate-limit'
import { logError } from '@/lib/utils/log'
import { averageScore } from '@/lib/progress/xp'
import CertificatePdf from '@/components/zertifikat/CertificatePdf'

export const dynamic = 'force-dynamic'
// @react-pdf/renderer with custom fonts + glyphs regularly takes
// 15-30 s for a full certificate; cover that with a generous bound.
export const maxDuration = 45

const PDF_LIMIT = 2
const PDF_WINDOW_MS = 60 * 60 * 1000

export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const rl = await rateLimitAsync(`pdf:${user.id}`, PDF_LIMIT, PDF_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.' },
      { status: 429 }
    )
  }

  const certificate = await prisma.certificate.findUnique({ where: { userId: user.id } })
  if (!certificate) return NextResponse.json({ error: 'Kein Zertifikat gefunden' }, { status: 404 })

  const attempts = await prisma.promptAttempt.findMany({
    where: { userId: user.id },
    select: { judgeScore: true },
  })
  const avgScore = averageScore(attempts)

  let buffer: Buffer
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const rendered = renderToBuffer(
      <CertificatePdf
        userName={user.name}
        completedAt={certificate.issuedAt.toISOString()}
        avgScore={avgScore}
      />
    )
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('PDF-Generierung Timeout')), 30_000)
    })
    buffer = await Promise.race([rendered, timeout])
  } catch (err) {
    logError('pdf', 'PDF generation failed', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'PDF konnte nicht generiert werden' }, { status: 500 })
  } finally {
    // Clear the setTimeout so the timer handle and its captured reject
    // closure don't linger for 30s after a successful render — otherwise
    // repeated downloads would leak Timeout objects under load.
    if (timer) clearTimeout(timer)
  }

  // Sanitize the filename before it lands in Content-Disposition.
  // user.name comes from Clerk and can contain `"` (closes the quoted
  // filename) or bidi/control chars that would malform the header.
  // Strip to letters/digits/spaces/hyphens, collapse whitespace, cap
  // length, and add an RFC 6266 filename* param for Unicode names.
  const rawName = user.name.replace(/[^\p{L}\p{N}\s-]/gu, '').trim() || 'User'
  const asciiSafe = rawName.replace(/\s+/g, '-').slice(0, 80)
  const filename = `PILIH-Zertifikat-${asciiSafe}.pdf`
  const encoded = encodeURIComponent(`PILIH-Zertifikat-${rawName}.pdf`)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'no-store',
    },
  })
}
