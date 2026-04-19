import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'
import { logError } from '@/lib/utils/log'

const querySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

const overrideSchema = z.object({
  submissionId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(2000).optional(),
})

export async function GET(req: NextRequest) {
  let admin
  try {
    admin = await requireRole(['COMPANY_ADMIN', 'SUPER_ADMIN'])
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
  }

  const { status, page, limit } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams)
  )

  // CRITICAL scoping fix: a COMPANY_ADMIN must NEVER see submissions
  // from other companies. The server page wrapper already filters by
  // companyId, but the paginator API was unscoped — a direct GET
  // `/api/admin/submissions?page=1` from a COMPANY_ADMIN session used
  // to return every other company's rows. Now scoped at the query.
  const where: Prisma.FinalSubmissionWhereInput = {
    ...(status ? { status } : {}),
    ...(admin.role === 'COMPANY_ADMIN'
      ? { user: { companyId: admin.companyId } }
      : {}),
  }

  // Mirror of the server page's projection (admin/submissions/page.tsx).
  // llmReview is intentionally omitted: it stores adminOverride.note +
  // reviewerId of previous reviewers and would leak across admins via
  // this JSON mirror. companyId on the joined user is also dropped for
  // COMPANY_ADMIN responses since they already know it's theirs.
  const [rows, totalCount] = await prisma.$transaction([
    prisma.finalSubmission.findMany({
      where,
      select: {
        id: true,
        status: true,
        useCase1: true,
        useCase2: true,
        useCase3: true,
        submittedAt: true,
        reviewedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            ...(admin.role === 'SUPER_ADMIN' ? { companyId: true } : {}),
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
    prisma.finalSubmission.count({ where }),
  ])

  return NextResponse.json({
    data: rows,
    totalCount,
    hasMore: page * limit + limit < totalCount,
  })
}

export async function PATCH(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  let admin
  try {
    admin = await requireRole(['COMPANY_ADMIN', 'SUPER_ADMIN'])
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = overrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }
  const { submissionId, status, note } = parsed.data

  try {
    const existing = await prisma.finalSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { select: { companyId: true } } },
    })
    // Collapse "not found" and "wrong company" into a single 404 for
    // COMPANY_ADMINs so the response doesn't leak whether a given id
    // exists at another company. SUPER_ADMIN still sees the explicit
    // 404-vs-403 split for operational clarity.
    if (!existing) {
      return NextResponse.json({ error: 'Einreichung nicht gefunden' }, { status: 404 })
    }
    if (admin.role === 'COMPANY_ADMIN' && existing.user.companyId !== admin.companyId) {
      return NextResponse.json({ error: 'Einreichung nicht gefunden' }, { status: 404 })
    }

    const reviewWithNote = existing.llmReview
      ? JSON.stringify({
          ...JSON.parse(existing.llmReview),
          adminOverride: { status, note, reviewerId: admin.id, reviewedAt: new Date().toISOString() },
        })
      : JSON.stringify({
          adminOverride: { status, note, reviewerId: admin.id, reviewedAt: new Date().toISOString() },
        })

    // Atomically write the override AND the AuditEvent so the
    // append-only admin trail can't drift from the row state.
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.finalSubmission.update({
        where: { id: submissionId },
        data: { status, llmReview: reviewWithNote, reviewedAt: new Date() },
      })
      await tx.auditEvent.create({
        data: {
          actorId: admin.id,
          action: 'submission.override',
          targetType: 'FinalSubmission',
          targetId: submissionId,
          diff: {
            from: existing.status,
            to: status,
            note: note ?? null,
          },
        },
      })
      return row
    })
    return NextResponse.json({ success: true, status: updated.status })
  } catch (err) {
    logError('admin.submission', 'PATCH failed', err)
    return NextResponse.json({ error: 'Update fehlgeschlagen' }, { status: 500 })
  }
}
