import { renderToBuffer } from '@react-pdf/renderer'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import CertificatePdf from '@/components/zertifikat/CertificatePdf'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return new Response('Nicht autorisiert', { status: 401 })

  const certificate = await prisma.certificate.findUnique({ where: { userId: user.id } })
  if (!certificate) return new Response('Kein Zertifikat gefunden', { status: 404 })

  const attempts = await prisma.promptAttempt.findMany({ where: { userId: user.id } })
  const avgScore = attempts.length
    ? attempts.reduce((acc, a) => acc + a.judgeScore, 0) / attempts.length
    : 0

  const buffer = await renderToBuffer(
    <CertificatePdf
      userName={user.name}
      completedAt={certificate.issuedAt.toISOString()}
      avgScore={avgScore}
    />
  )

  const filename = `PILIH-Zertifikat-${user.name.replace(/\s+/g, '-')}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
