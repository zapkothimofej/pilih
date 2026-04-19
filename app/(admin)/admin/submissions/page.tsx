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

  // Explicit select omits llmReview — that JSON blob stores
  // adminOverride.reviewerId + note from prior admin overrides.
  // The list UI never reads it; shipping it serialised the other
  // admins' reviewer IDs and free-text notes into every admin's
  // DOM payload.
  const submissions = await prisma.finalSubmission.findMany({
    where: whereBase,
    select: {
      id: true,
      status: true,
      useCase1: true,
      useCase2: true,
      useCase3: true,
      submittedAt: true,
      reviewedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
    take: 50,
  })

  return <SubmissionsClient initial={submissions} />
}
