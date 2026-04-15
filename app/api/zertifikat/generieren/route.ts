import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'

export async function POST() {
  
  

  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const submission = await prisma.finalSubmission.findUnique({ where: { userId: user.id } })
  if (!submission || submission.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Abschluss noch nicht genehmigt' }, { status: 400 })
  }

  // LinkedIn Share URL (Deep Link mit vorausgefülltem Text)
  const certText = encodeURIComponent(`Ich habe meinen KI-Führerschein abgeschlossen! 🔥🏆 21 Tage Prompt Engineering Training mit PILIH — "Prompt it like it's hot". #KI #PromptEngineering #PILIH #AILiteracy`)
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://pilih.app/zertifikat/' + user.id)}&summary=${certText}`

  const certificate = await prisma.certificate.upsert({
    where: { userId: user.id },
    update: { linkedInShareUrl, issuedAt: new Date() },
    create: {
      userId: user.id,
      pdfUrl: `/api/zertifikat/${user.id}/pdf`,
      badgeUrl: `/api/zertifikat/${user.id}/badge`,
      linkedInShareUrl,
    },
  })

  return NextResponse.json({ success: true, certificateId: certificate.id, linkedInShareUrl })
}
