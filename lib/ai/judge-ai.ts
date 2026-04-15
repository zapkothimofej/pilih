import Anthropic from '@anthropic-ai/sdk'

// Komplett isolierter Client — kein geteilter Kontext mit challenge-ai.ts
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type JudgeFeedback = {
  score: number // 1–10
  feedback: string
  improvements: string[]
  strengths: string[]
}

const JUDGE_SYSTEM_PROMPT = `Du bist ein Prompt-Engineering-Experte und bewertest Prompts objektiv.
Du bekommst NUR die Challenge-Beschreibung und den Prompt des Users — keinen weiteren Kontext.
Gib konstruktives, ermutigendes Feedback auf Deutsch.
Gib immer valides JSON zurück, keine Markdown-Codeblöcke.`

export async function judgePrompt(
  challengeDescription: string,
  userPrompt: string
): Promise<JudgeFeedback> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Challenge: ${challengeDescription}

User-Prompt: ${userPrompt}

Bewerte diesen Prompt und gib JSON zurück:
{
  "score": <1-10>,
  "feedback": "<2-3 Sätze Gesamtfeedback>",
  "strengths": ["<Stärke 1>", "<Stärke 2>"],
  "improvements": ["<Verbesserung 1>", "<Verbesserung 2>", "<Verbesserung 3>"]
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unerwarteter Response-Typ')

  const raw = content.text.trim()
  const jsonText = raw.startsWith('```') ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') : raw

  return JSON.parse(jsonText) as JudgeFeedback
}
