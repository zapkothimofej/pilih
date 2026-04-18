import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const submission = await prisma.finalSubmission.findUnique({ where: { userId: user.id } })
  if (!submission || submission.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Abschluss noch nicht genehmigt' }, { status: 400 })
  }

  // The share URL points at the in-app zertifikat page, which runs auth and
  // redirects when a visitor isn't the recipient. Avoids fictitious domains
  // or unauthenticated deep-links to personal data.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const certText = encodeURIComponent(
    `Ich habe meinen KI-Führerschein abgeschlossen! 🔥🏆 21 Tage Prompt Engineering Training mit PILIH — "Prompt it like it's hot". #KI #PromptEngineering #PILIH #AILiteracy`
  )
  const linkedInShareUrl =
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${appUrl}/zertifikat`)}&summary=${certText}`

  // Both routes really exist: /api/zertifikat/pdf streams the PDF and the
  // badge is served as a data URI by the share preview, so we just store
  // the canonical PDF endpoint for both.
  const pdfUrl = '/api/zertifikat/pdf'

  const certificate = await prisma.certificate.upsert({
    where: { userId: user.id },
    update: { linkedInShareUrl, pdfUrl, badgeUrl: pdfUrl, issuedAt: new Date() },
    create: {
      userId: user.id,
      pdfUrl,
      badgeUrl: pdfUrl,
      linkedInShareUrl,
    },
  })

  return NextResponse.json({ success: true, certificateId: certificate.id, linkedInShareUrl })
}
