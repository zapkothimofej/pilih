import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import SubmissionsClient from './SubmissionsClient'

export default async function SubmissionsAdminPage() {
  let admin
  try {
    admin = await requireRole(['COMPANY_ADMIN', 'SUPER_ADMIN'])
  } catch {
    redirect('/dashboard')
  }

  if (admin.role === 'COMPANY_ADMIN' && !admin.companyId) redirect('/dashboard')

  // Scope by company when COMPANY_ADMIN; SUPER_ADMIN sees everyone.
  const whereBase =
    admin.role === 'COMPANY_ADMIN'
      ? { user: { companyId: admin.companyId! } }
      : {}

  const submissions = await prisma.finalSubmission.findMany({
    where: whereBase,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
    take: 50,
  })

  return <SubmissionsClient initial={submissions} />
}
