---
title: "Session 2026-04-17 — Audit Findings"
source_url: null
captured_at: 2026-04-17
author: Claude Opus 4.7
contributor: Thimofej Zapko
tags: [session, audit, pilih, ui, ai, security]
---

# PILIH — Audit-Befunde (2026-04-17)

Drei unabhängige Audits wurden in dieser Session durchgeführt, bevor die Fixes starteten.

## 1. UI/UX/Design Audit — Gesamt 6.5/10

- **Design-System-Kohärenz (7/10):** Tokenized via CSS-Variablen in `app/globals.css`, aber zu viele Inline-Styles (~30–40 % statt Tailwind-Klassen).
- **Visual Identity / Brand (5/10):** Cooles Indigo `#818cf8` statt Fire-Accent. Marke verspricht „Prompt it like it's hot" — UI liefert kühl und generisch. Keine Custom-Illustrationen, keine Wärme, kein Drama.
- **Motion (7/10):** Framer Motion solide (DayRing, StreakCounter), aber keine Page-Transitions, keine Skeleton-Loader, Confetti generisch.
- **Empty/Error/Loading States (5/10):** Meist nur Text-Fallbacks, kein designtes Leer-Erlebnis.
- **Mobile & Touch (6/10):** 44px-Targets grösstenteils okay, aber 21-Tage-Kalender kann overflowen, keine Safe-Area für iOS.
- **Accessibility (6/10):** Focus-Ring definiert, aria-hidden auf Icons, aber keine reduced-motion, Icon-Buttons teils ohne aria-label.
- **Copywriting (7/10):** Deutsch konsistent, aber kein markantes Signature-Vokabular.
- **Komponenten-Qualität (7/10):** DayRing/StreakCounter/XPBar premium, Certificate-Card statisch und uninspiriert.
- **Onboarding-Finale (7/10):** Funktional, aber kein Celebration-Moment nach Schritt 3.

**Hauptdiagnose:** B- Effort in A+ Markt. Infrastruktur steht, Personality fehlt.

## 2. Challenge & Judge AI Audit — Gesamt 5.75/10

- **Challenge-Generation (6/10):** Prompt in `lib/ai/challenge-ai.ts` war 11 Zeilen, generisch. Keine Technik-Taxonomie (Few-Shot, CoT, Rollen-Prompting), keine Tool-Diversität, kein Anti-Repetition-Constraint. 21 Challenges würden ab Tag 10 repetitiv werden.
- **Judge LLM (7/10):** Gut isoliert (separate Client-Instance in `lib/ai/judge-ai.ts`), aber 4-Zeilen-Prompt ohne Rubrik, keine Technik-Focus-Ausgabe. Lief bei jedem Attempt statt ab Attempt 3.
- **Chat-UX (8/10):** Streaming solide, Persistence via `PromptAttempt`, Rate-Limit 20/h. Fehlend: Markdown-Render, Code-Blocks, Image-Uploads für Screenshot-Challenges.
- **Adaptive Difficulty (5/10):** `difficultyRating` + `selectDailyChallenges` wired, aber Judge-Score fliesst nicht in Adaption.
- **Abschluss / Certificate (2/10):** `app/api/submission/route.ts` hardcodete `status: 'APPROVED'` unabhängig vom LLM-Review. Jeder mit 10 Zeichen pro Feld bekam den Führerschein.
- **Security (7/10):** Keys server-seitig, aber `.env.local` suspicion, Prompt-Injection nicht mitigiert.
- **Admin / Human-Review (2/10):** API-Route `admin/teilnehmer` existiert, kein UI. Konzept verlangt menschliche Challenge-Review — fehlt.

## 3. Ultrareview — 8 Bugs nach Polish-Pass

Nach dem ersten Polish-Durchgang lief `/ultrareview` gegen den Branch und fand 8 Bugs:

1. **Bug 1 — `react-markdown` v10 `inline` prop entfernt:** `ChatInterface.tsx:358-385` rendert inline-Code als Block, bricht jeden Satz mit Backticks.
2. **Bug 2 — Client/Server Validation Mismatch:** `AbschlussClient.tsx:43-45` erlaubt 10-char-Fields, Server zod `app/api/submission/route.ts:14-19` verlangt 20/30. User verbrät 5-stündige Rate-Limit-Slots auf 400-Errors ohne Field-Feedback.
3. **Bug 3 — Adaptive Difficulty einen Tag hinterher:** `app/api/challenges/heute/route.ts:34-40` liest `currentDifficulty` von der just-completed Challenge; die `updateMany` im `abschliessen` excludet genau diese Row. Plus `selectDailyChallenges` filterte auf `c.difficulty` statt `c.currentDifficulty`.
4. **Bug 5 — SSE 429/400/403/404 Dead-End + XP-Bypass:** `ChatInterface.tsx:60-68` schlucke JSON-Errors (kein `data:` Prefix), optimistisches `setAttempts` ohne Rollback. User kann nach 1ten 429-Fail „Challenge abschliessen" klicken und 100 XP kassieren mit 0 echten `PromptAttempt`-Rows.
5. **Bug 6 — `PromptAttempt` Count+Create Race:** `attempt/route.ts:95-109` Transaction verhindert NICHT die Race unter READ COMMITTED. Zwei parallele Requests können beide `attemptNumber=N+1` schreiben.
6. **Bug 12 — `FinalSubmission` Upsert kann APPROVED downgraden:** `submission/route.ts:171-190` upserted ohne Status-Check. Retry/direkter POST kann APPROVED → REJECTED flippen und Audit-Trail zerstören.
7. **Bug 16 — XML-Tag-Escape Prompt-Injection:** `submission/route.ts:102-111` und `lib/ai/judge-ai.ts:54-66` interpolieren User-Input roh in `<use_case>`/`<user_prompt>`-Envelopes. User kann `</use_case>` + fake Sibling-Tags injecten und Judge steuern.
8. **Bug 17 — `datetime-local` min nutzt UTC via `toISOString()`:** `BuchungClient.tsx:57-59`. Ost-von-UTC User umgehen 60-Min-Lead-Buffer, West-von-UTC User verlieren legitime Slots. Server in `api/buchungen/route.ts:40` prüft nur `< new Date()` (Past), nicht den Buffer.

## Token-Ökonomie Baseline

- Challenge-Generation (1x pro User, Sonnet 8000 tokens): ~$0.05
- Attempt (20/Tag × Sonnet Chat + Haiku Judge): ~$0.60/Tag
- 21 Tage: ~$12.65/User
- Ohne Spending-Cap — Risiko bei Bot-Traffic

## Produkt-Distanz

**Vor Polish:** ~55 % bis „perfekt"
**Nach Polish + Bugfixes:** ~78 %
**Bis 95 %+ fehlen:** Brand-Identität (Feuer-Accent statt Indigo), Admin-Review-Panel, echte Tests, Auth-Reaktivierung, Onboarding/Certificate-Celebration, Attachment-Upload für Vision-Challenges.
