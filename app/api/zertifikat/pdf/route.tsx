import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logError } from '@/lib/utils/log'
import CertificatePdf from '@/components/zertifikat/CertificatePdf'

export const dynamic = 'force-dynamic'

const PDF_LIMIT = 2
const PDF_WINDOW_MS = 60 * 60 * 1000

export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const rl = rateLimit(`pdf:${user.id}`, PDF_LIMIT, PDF_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.' },
      { status: 429 }
    )
  }

  const certificate = await prisma.certificate.findUnique({ where: { userId: user.id } })
  if (!certificate) return NextResponse.json({ error: 'Kein Zertifikat gefunden' }, { status: 404 })

  const attempts = await prisma.promptAttempt.findMany({ where: { userId: user.id } })
  const avgScore = attempts.length
    ? attempts.reduce((acc, a) => acc + a.judgeScore, 0) / attempts.length
    : 0

  let buffer: Buffer
  try {
    const rendered = renderToBuffer(
      <CertificatePdf
        userName={user.name}
        completedAt={certificate.issuedAt.toISOString()}
        avgScore={avgScore}
      />
    )
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF-Generierung Timeout')), 30_000)
    )
    buffer = await Promise.race([rendered, timeout])
  } catch (err) {
    logError('pdf', 'PDF generation failed', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'PDF konnte nicht generiert werden' }, { status: 500 })
  }

  const filename = `PILIH-Zertifikat-${user.name.replace(/\s+/g, '-')}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
