import Anthropic from '@anthropic-ai/sdk'
import type { OnboardingProfile } from '@/app/generated/prisma/client'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type GeneratedChallenge = {
  dayNumber: number
  title: string
  description: string
  promptingTips: string
  category: string
  difficulty: number // 1–5
}

const SYSTEM_PROMPT = `Du bist ein erfahrener KI-Trainer und Prompt-Engineering-Experte.
Deine Aufgabe ist es, personalisierte Prompt-Engineering-Challenges zu erstellen,
die auf dem Berufsprofil des Users basieren.

Jede Challenge soll:
- Einen echten, praktischen AI-Use-Case aus dem Berufsalltag des Users darstellen
- Handwerklich das Prompting verbessern
- Den User überraschen ("Wow, daran hatte ich noch gar nicht gedacht!")
- Auf Deutsch verfasst sein

Gib immer valides JSON zurück, keine Markdown-Codeblöcke.`

export async function generateChallenges(
  profile: OnboardingProfile
): Promise<GeneratedChallenge[]> {
  const userContext = `
Beruf: ${profile.jobTitle}
Firma: ${profile.companyName}
Abteilung: ${profile.department}
Alltag: ${profile.dailyDescription}
AI-Kenntnisstand: ${profile.aiSkillLevel}
Verwendete Tools: ${profile.aiToolsUsed.join(', ')}
Nutzungshäufigkeit: ${profile.aiFrequency}
`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Erstelle genau 21 personalisierte Prompt-Engineering-Challenges für diesen User.

${userContext}

Die Challenges sollen progressiv schwieriger werden (difficulty 1–5, mind. 4 Challenges pro Schwierigkeitsstufe).
Verschiedene Kategorien abdecken: z.B. Research, Analyse, Texterstellung, Datenauswertung, Kreativarbeit, Kommunikation.

Gib ein JSON-Array zurück mit exakt diesem Format:
[
  {
    "dayNumber": 1,
    "title": "Kurzer Titel",
    "description": "Detaillierte Beschreibung der Challenge (2-3 Sätze, was der User tun soll)",
    "promptingTips": "3 konkrete Prompting-Tipps für diese Challenge",
    "category": "Kategorie",
    "difficulty": 2
  }
]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unerwarteter Response-Typ von Claude')

  // Strip optional markdown code fences (```json ... ``` or ``` ... ```)
  const raw = content.text.trim()
  const jsonText = raw.startsWith('```') ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') : raw

  return JSON.parse(jsonText) as GeneratedChallenge[]
}

export async function* streamChallengeResponse(
  challengeDescription: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userPrompt: string
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `Du bist ein hilfreicher KI-Assistent. Führe den Auftrag des Users präzise aus.
Keine Emojis. Kein Feedback, keine Bewertungen, keine Kommentare zu Formulierungen des Users.
Antworte nur auf Deutsch, außer der User schreibt explizit auf Englisch.`,
    messages: [
      ...chatHistory,
      { role: 'user', content: userPrompt },
    ],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}
