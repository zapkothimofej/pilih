import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import CertificateCard from '@/components/zertifikat/CertificateCard'
import KonfettiAnimation from '@/components/zertifikat/KonfettiAnimation'

export default async function ZertifikatPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const certificate = await prisma.certificate.findUnique({ where: { userId: user.id } })
  if (!certificate) redirect('/abschluss')

  const attempts = await prisma.promptAttempt.findMany({ where: { userId: user.id } })
  const avgScore = attempts.length
    ? attempts.reduce((acc, a) => acc + a.judgeScore, 0) / attempts.length
    : 0

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <KonfettiAnimation />

      <div className="text-center space-y-2">
        <div className="text-5xl">🏆</div>
        <h1 className="text-3xl font-bold text-white">Glückwunsch!</h1>
        <p className="text-zinc-400">Du hast deinen KI-Führerschein erhalten</p>
      </div>

      <CertificateCard
        userName={user.name}
        completedAt={certificate.issuedAt.toISOString()}
        avgScore={avgScore}
        linkedInShareUrl={certificate.linkedInShareUrl}
      />
    </div>
  )
}
