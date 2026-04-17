import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logError } from '@/lib/utils/log'

type ClerkWebhookEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string | null
    last_name: string | null
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('Webhook secret fehlt', { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Fehlende Svix-Header', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(webhookSecret)

  let event: ClerkWebhookEvent
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return new Response('Webhook-Verifikation fehlgeschlagen', { status: 400 })
  }

  // Idempotency + work in a single transaction so a failed upsert leaves
  // the ProcessedWebhook row out and Svix can retry. If the svix row
  // already exists (P2002), the event was handled before → 200.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.processedWebhook.create({ data: { svixId } })

      if (event.type === 'user.created' || event.type === 'user.updated') {
        const { id, email_addresses, first_name, last_name } = event.data
        const email = email_addresses[0]?.email_address ?? ''
        const name = `${first_name ?? ''} ${last_name ?? ''}`.trim()
        await tx.user.upsert({
          where: { clerkId: id },
          update: { email, name },
          create: { clerkId: id, email, name },
        })
      } else if (event.type === 'user.deleted') {
        await tx.user.deleteMany({ where: { clerkId: event.data.id } })
      }
    })
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new Response('OK', { status: 200 })
    }
    logError('webhook', 'Handler failed, letting Svix retry', err)
    return new Response('Webhook-Verarbeitung fehlgeschlagen', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
