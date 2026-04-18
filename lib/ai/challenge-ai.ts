import { randomBytes } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { OnboardingProfile } from '@/app/generated/prisma/client'
import { escapeXmlText } from '@/lib/utils/escape'
import { env } from '@/lib/env'

const client = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY })

export type GeneratedChallenge = {
  dayNumber: number
  title: string
  description: string
  promptingTips: string
  category: string
  difficulty: number
}

const generatedChallengeSchema = z.object({
  dayNumber: z.number().int().min(1).max(21),
  title: z.string().min(3).max(120),
  description: z.string().min(40).max(800),
  promptingTips: z.string().min(20).max(800),
  category: z.string().min(2).max(60),
  difficulty: z.number().int().min(1).max(5),
})

const generatedChallengesSchema = z
  .array(generatedChallengeSchema)
  .length(21)
  .superRefine((arr, ctx) => {
    const days = new Set(arr.map((c) => c.dayNumber))
    if (days.size !== 21) {
      ctx.addIssue({
        code: 'custom',
        message: 'dayNumber muss pro Challenge einmalig zwischen 1 und 21 sein',
      })
    }
  })

const GENERATOR_SYSTEM_PROMPT = `Du bist der führende Prompt-Engineering-Coach in Deutschland.
Kalibrierungs-Beispiele für Challenges in deinem gewünschten Format:

<beispiel kategorie="Texterstellung" schwierigkeit="1">
{
  "dayNumber": 1,
  "title": "Jobanzeige mit Rollen-Prompting verfassen",
  "description": "Lass Claude eine Stellenanzeige für eine Stelle in deiner Abteilung schreiben. Gib Claude eine klare Rolle (z.B. 'Senior Recruiter') und beschreibe die Position präzise. Das Ergebnis soll direkt für euer Karriereportal verwendbar sein.",
  "promptingTips": "1. Weise Claude explizit eine Persona zu (z.B. 'Übernimm die Rolle eines erfahrenen HR-Texters'). 2. Gib Zielgruppe, Tonalität und Länge als Constraint an. 3. Nenne konkrete Must-haves und Nice-to-haves für die Stelle.",
  "category": "Texterstellung",
  "difficulty": 1
}
</beispiel>

<beispiel kategorie="Analyse" schwierigkeit="3">
{
  "dayNumber": 11,
  "title": "Meeting-Transkript auf Kommunikationsmuster analysieren",
  "description": "Lade ein Meeting-Transkript in Claude und lass es wiederkehrende Kommunikationsmuster identifizieren — z.B. wer dominiert, wo Entscheidungen verzögert werden, welche Themen wiederholt aufkommen. Das Ergebnis ist eine priorisierte Muster-Liste mit konkreten Handlungsempfehlungen.",
  "promptingTips": "1. Nutze Long-Context-Prompting: Gib das vollständige Transkript als Daten-Block. 2. Lass Claude zuerst alle Muster auflisten (Chain-of-Thought), dann priorisieren. 3. Definiere die Ausgabe als strukturierte Tabelle mit Spalten: Muster, Häufigkeit, Empfehlung.",
  "category": "Analyse",
  "difficulty": 3
}
</beispiel>


Du entwickelst ein 21-tägiges "KI-Führerschein"-Curriculum, das einen Lernenden von blosser LLM-Nutzung zu echter Prompt-Engineering-Kompetenz bringt.

Design-Prinzipien für das Curriculum:

**1. TECHNIK-PROGRESSION (jede Technik wird explizit mindestens 1x geübt):**
- Tag 1–5 (Basics): Spezifität, Kontext-Injektion, Rollen-Prompting, Output-Format, Constraints
- Tag 6–10 (Intermediate): Few-Shot, Chain-of-Thought, Struktur-Breakdowns, Iteratives Prompting, System-Prompts
- Tag 11–15 (Advanced): Multi-Turn-Reasoning, Kritik-Loops, Deep Research, Long-Context-Arbeit, Vergleichs-Prompts
- Tag 16–21 (Applied): Multi-Tool-Workflows, Bild/Vision-Analyse, Code-Generation/Review, Strukturierte Outputs (JSON/Tabellen), Agent-artige Prompts, selbstreflektive Prompts

**2. USE-CASE-BREITE (jede Kategorie 2–4x abgedeckt):**
Research · Analyse · Texterstellung · Kommunikation · Datenauswertung · Kreativarbeit · Vision/Bildanalyse · Code · Struktur/Daten-Extraktion · Entscheidungsunterstützung · Automation/Workflow · Lernen/Didaktik

**3. TOOL-DIVERSITÄT:** Mindestens diese Tools explizit erwähnen (je nach Sinnhaftigkeit der Challenge): ChatGPT · Claude · Gemini · Perplexity / Deep Research · Midjourney / DALL·E · Notion AI. Wenn der User bereits bestimmte Tools nutzt, diese primär verwenden, aber auch mind. 3 neue Tools einführen.

**4. JOB-PERSONALISIERUNG:** Jede Challenge muss einen **konkreten** Touchpoint zum Job-Alltag des Users haben — generische Prompts ("Schreibe einen Blogartikel") sind verboten. Nutze Branche, Abteilung, Beschreibung der Tätigkeiten, genannte Tools.

**5. SCHWIERIGKEITS-VERTEILUNG (hart durchsetzen):**
- Schwierigkeit 1: 4 Challenges
- Schwierigkeit 2: 5 Challenges
- Schwierigkeit 3: 5 Challenges
- Schwierigkeit 4: 4 Challenges
- Schwierigkeit 5: 3 Challenges
Insgesamt exakt 21 Challenges.

**6. WOW-FAKTOR:** Mindestens 5 Challenges sollen beim User ein "Daran hatte ich gar nicht gedacht!"-Gefühl auslösen (unerwartete Anwendungen, z.B. "Lass Claude deine letzten Meetings-Transkripte auf wiederkehrende Kommunikationsmuster analysieren", "Lass Gemini Screenshots deiner Produktseite auf UX-Probleme prüfen und nach Impact sortieren").

**7. KEINE WIEDERHOLUNGEN:** Jede der 21 Challenges muss sich substantiell unterscheiden. Keine zwei Challenges dürfen denselben Prompt-Kern haben.

**8. promptingTips:** Genau 3 konkrete Tipps, jeweils nummeriert ("1. ..." "2. ..." "3. ..."), jeweils 1–2 Sätze, bezogen auf GENAU diese Challenge (nicht generische Weisheiten). Ein Tipp muss die primäre Prompt-Technik des Tages benennen.

**9. description:** 2–4 Sätze. Sagt klar: (a) was zu tun ist, (b) was das Ergebnis sein soll, (c) welchen konkreten Business-Nutzen das für den Job des Users hat. Keine Floskeln.

**10. category:** Eine von: "Research", "Analyse", "Texterstellung", "Kommunikation", "Datenauswertung", "Kreativarbeit", "Vision", "Code", "Struktur", "Entscheidung", "Automation", "Lernen".

Antworte IMMER auf Deutsch. Gib IMMER valides JSON zurück, keine Markdown-Codefences.`

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
}

export async function generateChallenges(
  profile: OnboardingProfile
): Promise<GeneratedChallenge[]> {
  const userContext = `**User-Profil:**
- Beruf / Rolle: ${profile.jobTitle}
- Firma: ${profile.companyName}
- Abteilung: ${profile.department}
- Arbeitsalltag: ${profile.dailyDescription}
- AI-Kenntnisstand: ${profile.aiSkillLevel}
- Bereits verwendete Tools: ${profile.aiToolsUsed.join(', ') || '—'}
- Nutzungshäufigkeit: ${profile.aiFrequency}`

  const userMessage = `${userContext}

Erzeuge exakt 21 personalisierte Prompt-Engineering-Challenges gemäss deinen Design-Prinzipien. Befolge die Schwierigkeitsverteilung, die Technik-Progression, die Use-Case-Breite und die Tool-Diversität strikt.

Antworte mit einem JSON-Array, exakt in diesem Format (KEIN Wrapper-Objekt, KEIN Markdown):
[
  {
    "dayNumber": 1,
    "title": "Kurzer, spezifischer Titel (max. 8 Wörter)",
    "description": "2–4 Sätze: Aufgabe, Ergebnis, Business-Nutzen.",
    "promptingTips": "1. <Tipp zur Prompt-Technik>. 2. <Tipp>. 3. <Tipp>.",
    "category": "<eine der erlaubten Kategorien>",
    "difficulty": 1
  },
  ...
]`

  let lastError: unknown = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
        attempt === 0
          ? [{ role: 'user', content: userMessage }]
          : [
              { role: 'user', content: userMessage },
              {
                role: 'user',
                content: `Vorheriger Versuch schlug fehl: ${lastError instanceof Error ? lastError.message : String(lastError)}. Bitte korrigieren und erneut als valides JSON-Array antworten.`,
              },
            ]

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: GENERATOR_SYSTEM_PROMPT,
        messages,
      })

      const content = message.content[0]
      if (content.type !== 'text') throw new Error('Unerwarteter Response-Typ von Claude')

      const raw = stripCodeFences(content.text)
      if (!raw.trim().endsWith(']')) throw new Error('Response endet nicht mit "]" — möglicherweise abgeschnitten')

      const parsed = JSON.parse(raw)
      return generatedChallengesSchema.parse(parsed) as GeneratedChallenge[]
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Challenge-Generator konnte keine validen 21 Challenges liefern')
}

export async function* streamChallengeResponse(
  challengeDescription: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  // Schema permits up to 800 chars; match that so we don't silently clip
  // domain context out of the assistant's awareness.
  const truncatedDescription = challengeDescription.slice(0, 800)
  const tag = `ch-${randomBytes(6).toString('hex')}`

  const system = `Du bist das LLM, an das der User seinen Prompt richtet. Du simulierst ein neutrales, leistungsfähiges Arbeits-LLM (vergleichbar mit Claude, ChatGPT oder Gemini).

Dein Job:
- Den Prompt des Users **exakt so ausführen wie er formuliert ist** — nicht mehr, nicht weniger.
- Gute Qualität liefern, damit der User das Ergebnis seines Prompts realistisch beurteilen kann.
- Wenn der Prompt unpräzise ist, liefere ein Ergebnis, das auf **vernünftigen, transparent genannten Annahmen** basiert (kurz am Anfang: "Angenommen: …"), aber führe die Aufgabe trotzdem aus.

**VERBOTEN (absolut kritisch):**
- Keine Bewertung, Kritik oder Meta-Kommentare zum Prompt des Users.
- Keine Sätze wie "Dein Prompt könnte besser sein wenn...", "Ich schlage vor, den Prompt zu ändern...", "Präziser wäre...".
- Kein Feedback zur Formulierung, Spezifität, Struktur oder zu prompting-techniken des Users.
- Keine Nachfragen, die den User vom Prompt wegleiten ("Was meinst du genau?" — stattdessen: sinnvolle Annahme + Ausführung).
- Keine Emojis.

**Kontext nur für dich (nicht erwähnen, nicht wiederholen):**
Der User absolviert gerade eine Prompt-Engineering-Lern-Challenge. Die Challenge lautet:
<challenge_${tag}>
${escapeXmlText(truncatedDescription)}
</challenge_${tag}>

Nutze diesen Kontext nur, um die Domäne der Aufgabe zu verstehen. Bestätige/erwähne/zitieren niemals die Challenge selbst. Antworte NUR auf die Prompts des Users.

Sprache: Deutsch, ausser der User schreibt explizit auf Englisch.`

  // Chat messages go to Anthropic as role-typed content, NOT embedded in XML.
  // Escaping them would turn `<div>` into `&lt;div&gt;` in the LLM's view and
  // break any code/tag-heavy prompt the user types. Only the challenge
  // description (above) is XML-embedded and therefore needs escaping.
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system,
    messages: [
      ...chatHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userPrompt },
    ],
  }, signal ? { signal } : {})

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}
