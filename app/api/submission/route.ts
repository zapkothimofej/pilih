import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const useCaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  prompt: z.string().min(10),
  result: z.string().min(10),
})

const schema = z.object({
  useCase1: useCaseSchema,
  useCase2: useCaseSchema,
  useCase3: useCaseSchema,
})

export async function POST(req: Request) {
  
  

  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { useCase1, useCase2, useCase3 } = parsed.data

  // LLM-Review
  const review = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: 'Du bewertest eingereichte KI-Anwendungsfälle von Kursteilnehmern. Sei konstruktiv und ermutigend. Antworte auf Deutsch.',
    messages: [{
      role: 'user',
      content: `Bewerte diese 3 selbst gefundenen KI-Use-Cases des Teilnehmers:\n\n1. ${useCase1.title}: ${useCase1.description}\nPrompt: ${useCase1.prompt}\n\n2. ${useCase2.title}: ${useCase2.description}\nPrompt: ${useCase2.prompt}\n\n3. ${useCase3.title}: ${useCase3.description}\nPrompt: ${useCase3.prompt}\n\nSind die Use-Cases eigenständig und praktisch? Gib kurzes Gesamtfeedback (3-4 Sätze).`,
    }],
  })

  const llmReview = review.content[0].type === 'text' ? review.content[0].text : ''

  const submission = await prisma.finalSubmission.upsert({
    where: { userId: user.id },
    update: { useCase1, useCase2, useCase3, llmReview, status: 'APPROVED', reviewedAt: new Date() },
    create: { userId: user.id, useCase1, useCase2, useCase3, llmReview, status: 'APPROVED', reviewedAt: new Date() },
  })

  return NextResponse.json({ success: true, submissionId: submission.id, llmReview })
}
