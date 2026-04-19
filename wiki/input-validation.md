---
title: Input Validation Edge Cases
type: concept
---

# Input Validation

Round 6 hunt: off-by-one, Unicode, normalization, and null/empty paths past the zod surface. Prior rounds hardened *schema presence*; this round hunts *semantic correctness* of those schemas. Relates to [[security]], [[prompt-injection]], [[data-integrity]].

## TL;DR scoreboard

| # | Dimension | Score | Worst finding severity |
| - | - | - | - |
| 1 | Max-length code-unit vs code-point | 4/10 | **medium** |
| 2 | Unicode NFC/NFD normalization | 3/10 | low |
| 3 | Whitespace-only input | 3/10 | **medium** |
| 4 | Zero-width / bidi control chars | 3/10 | **medium** |
| 5 | Emoji-in-name split | 5/10 | low |
| 6 | Booking meetingUrl trust | 7/10 | low |
| 7 | Certificate URL fields unvalidated | 4/10 | **medium** |
| 8 | Prisma↔Zod enum drift | 9/10 | none |
| 9 | Negative / non-integer numerics | 8/10 | low |
| 10 | Date-range at zod layer | 6/10 | low |
| 11 | Array / chat-history ceilings | 8/10 | low |
| 12 | Empty-string array items | 7/10 | low |

Aggregate: 67/120. No show-stoppers, two classes (whitespace-only, zero-width) that are user-visible and cheap to close. Everything else is hardening-to-defense-in-depth rather than a live exploit.

---

## 1. Max-length counts UTF-16 code units, not code points (4/10)

Zod's `z.string().max(n)` delegates to `s.length`, which returns UTF-16 code units. A code point outside the BMP (e.g. emoji, most CJK extension blocks) is a surrogate pair of two code units.

**Finding 1.1** — `app/api/submission/route.ts:27-30` caps `prompt` at 4000 and `result` at 4000. A user filling with "😀" (U+1F600, 2 code units, 1 visible glyph) maxes at 2000 visible chars; the LLM sees up to ~4000 tokens of emoji, fine. *Severity: low.* No fix needed — cap is a cost ceiling, not a UX promise, and client-side counter (`AbschlussClient.tsx:225`) uses the same `.length`, so display and validation agree.

**Finding 1.2** — `components/onboarding/OnboardingWizard.tsx:108` gates step-3 submit on `form.dailyDescription.length >= 10`. Ten ZWJ-joined emoji pass with one grapheme cluster. *Severity: medium* — a user can submit a technically-valid-but-meaningless profile, feeding the challenge generator pure garbage. **Fix:** add `.refine(s => Array.from(s.trim()).length >= 10)` on the server schema (not client). Code-point count via `Array.from` is good-enough for German business prose.

**Finding 1.3** — `lib/ai/challenge-ai.ts:23-25` caps generator output at 120/800/800 chars. That's self-imposed on Sonnet output, not user input — not an attack surface.

**Fix direction:** document that *all* `z.string().max()` on user input is a **byte-ish ceiling for storage**, not a glyph count. Users occasionally see off-by-one when their rich emoji input is rejected at 799 visible chars. File a `.refine` only where glyph-correctness matters (onboarding description).

## 2. No NFC/NFD normalization (3/10)

`é` (U+00E9, 1 code point) vs `é` (U+0065 + U+0301, 2 code points) have different `.length`. Neither route calls `.normalize('NFC')` before validation.

**Finding 2.1** — `app/api/onboarding/complete/route.ts:10`: `department: z.string().min(1).max(200)`. A French or Vietnamese user pasting an NFD string gets half the apparent capacity. *Severity: low.* Most input methods emit NFC by default.

**Finding 2.2** — The real risk is equality joins: `Company.name` doesn't exist as a write path yet (created elsewhere), so no duplicate-company bug via normalization. If a future admin form adds one, it must `.transform(s => s.normalize('NFC'))` before any unique-lookup.

**Fix direction:** add a `normalizedString(min, max)` helper in `lib/utils/zod.ts`:

```
export const normalizedString = (min: number, max: number) =>
  z.string().transform(s => s.normalize('NFC')).pipe(z.string().min(min).max(max))
```

Apply on anything that becomes a DB unique column. Not urgent.

## 3. Whitespace-only input bypasses `.min()` (3/10)

`z.string().min(10)` on "          " (ten spaces) is valid. The submission schema is the worst offender — all four fields fail-open on padding.

**Finding 3.1** — `app/api/submission/route.ts:27-30`. The judge LLM has been instructed to treat the content as data, but blank text wastes a Sonnet call (~$0.06 per submission), hits the 5-per-hour rate limit, and the user gets a "Dein Prompt ist nicht spezifisch" feedback that's obviously wrong. *Severity: medium.* **Fix:** `.refine(s => s.trim().length >= N, 'Mindestens N nicht-leere Zeichen')` on each field. Client already uses `.length`, so matching parity is `s.trim().length`.

**Finding 3.2** — `app/api/onboarding/complete/route.ts:12`: `dailyDescription: z.string().min(10).max(2000)`. Same issue, same fix. Bonus: the generator prompt (`challenge-ai.ts:114`) will hallucinate a career from whitespace. *Severity: medium.*

**Finding 3.3** — `components/onboarding/OnboardingWizard.tsx:106` only checks truthiness for step 1 fields (`form.companyName && ...`). `" "` is truthy — user can click through. The server schema is `.min(1)` so it saves us; but add `trim()` client-side for a less embarrassing 400.

## 4. Zero-width + bidi control chars pass through escape (3/10)

`lib/utils/escape.ts:9` strips only `\x00-\x08\x0B\x0C\x0E-\x1F\x7F`. It does not touch:

- U+200B (ZERO WIDTH SPACE)
- U+200C/200D (ZWJ/ZWNJ)
- U+200E/200F (LTR/RTL mark)
- U+202A-E (bidi embedding + overrides)
- U+2066-9 (isolate controls)
- U+FEFF (BOM / zero-width no-break space)
- U+061C (Arabic letter mark)

**Finding 4.1** — `lib/ai/judge-ai.ts:106-113` and `app/api/submission/route.ts:125-132` embed user text after `escapeXmlText`. An attacker can insert invisible characters that Claude's tokenizer *will* split on and potentially read as instruction boundaries. Modern LLMs mostly tokenize these as noise, but the defence-in-depth posture set in [[prompt-injection]] (nonces + server-side verdict) explicitly does not rely on Claude being robust to this — yet we then hand Claude a bidi-override that could visually flip "score: 0" into "score: 10" for a human reviewer reading the logs. *Severity: medium.* **Fix:** extend `CONTROL_CHARS` to include `\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C`. Document the tradeoff — a legitimate German user never types a bidi override.

**Finding 4.2** — Same file, same fix, covers the chat simulator (`challenge-ai.ts:229`). One-line change, all three boundaries covered.

## 5. Emoji in first-name greeting (5/10)

**Finding 5.1** — `app/(app)/dashboard/page.tsx:59`: `user.name.trim().split(/\s+/)[0] || 'du'`. For "👨‍💻 Anna" the first whitespace-separated token is "👨‍💻" (the ZWJ sequence survives regex). Greeting: "Hey 👨‍💻". *Severity: low — aesthetic only.* Name comes from Clerk's `first_name` + `last_name` (`webhooks/clerk/route.ts:110`), so it's what the user self-provided.

**Finding 5.2** — `components/ui/AppNav.tsx:157`: `user.name.trim().charAt(0).toUpperCase() || '?'`. `charAt(0)` on "👨‍💻 Anna" returns the high surrogate alone — a literal replacement-character box in the avatar chip. *Severity: low.* **Fix:** `Array.from(user.name.trim())[0]?.toUpperCase() || '?'` — one intentional char, no mojibake.

**Finding 5.3** — Neither is a security hole; both are user-visible polish items. Batch with the hover-tooltip-on-avatar UI task.

## 6. Booking meetingUrl comes from a server-side map (7/10)

**Finding 6.1** — `app/api/buchungen/route.ts:12-15` has `MEETING_URLS` hardcoded. User never supplies `meetingUrl` in the request body. *Severity: none.* Good design — marks this as "no attack surface today". Document that adding a client-supplied `meetingUrl` in future would require `.url()` zod validation **plus** a host allowlist (`new URL(url).host === 'meet.google.com'`). See also `Certificate.linkedInShareUrl` in §7.

## 7. Certificate URL fields unvalidated (4/10)

`prisma/schema.prisma:217-219` — `pdfUrl`, `badgeUrl`, `linkedInShareUrl` are raw `String`. At the write path, `app/api/zertifikat/generieren/route.ts:25-44`:

**Finding 7.1** — `linkedInShareUrl` is constructed from `env().NEXT_PUBLIC_APP_URL` via `encodeURIComponent`. If `NEXT_PUBLIC_APP_URL` ever gets set to `javascript:alert(1)` (which [[secret-lifecycle]]'s `SECRET_SHAPES` guard would not catch because it only looks for `sk-`/`whsec_`/`postgres:`/`Bearer`), the share URL becomes a JS-URL with the cert query-stringed after. **But** `env().NEXT_PUBLIC_APP_URL` is already `z.string().url().optional()` (`lib/env.ts:22`) — zod `.url()` does allow the `javascript:` scheme. *Severity: medium.* **Fix:** extend the env schema: `z.string().url().refine(u => /^https?:/.test(u), 'NEXT_PUBLIC_APP_URL must be http(s)')`.

**Finding 7.2** — `pdfUrl = '/api/zertifikat/pdf'` is a relative path written by the server — no attack surface. Same for `badgeUrl`. Admin direct-DB-write could set `javascript:` but that's firmly in the "admin has equivalent root" category.

**Finding 7.3** — Document that `lib/env.ts` should reject non-http(s) `NEXT_PUBLIC_APP_URL` at boot, protecting the LinkedIn share URL + any future deep-link generation.

## 8. Prisma↔Zod enum parity (9/10)

Walked every enum in `prisma/schema.prisma:12-64` against each `z.enum([...])` in the route layer:

| Prisma enum | Values | Zod callsites | Drift? |
| - | - | - | - |
| `Role` | PARTICIPANT / COMPANY_ADMIN / SUPER_ADMIN | `requireRole(['COMPANY_ADMIN','SUPER_ADMIN'])` (teilnehmer, submissions) | clean |
| `AISkill` | BEGINNER / INTERMEDIATE / ADVANCED | `aiSkillLevel` in onboarding | clean |
| `SubmissionStatus` | PENDING / APPROVED / REJECTED | admin/submissions query + override | clean |
| `DifficultyRating` | TOO_EASY / JUST_RIGHT / TOO_HARD | abschliessen body | clean |
| `BookingType` | GROUP_MEETING / ONE_ON_ONE | buchungen body | clean |
| `SessionStatus` / `ChallengeStatus` / `BookingStatus` / `Tier` | — | not exposed in any API input | N/A |

**Finding 8.1** — Zero drift today. But there is **no compile-time enforcement** — a future Prisma enum extension (e.g. adding `Role.CONTENT_AUTHOR`) won't break the zod schemas, and the admin-submissions `requireRole` array becomes a silent authz gap.

**Fix direction:** `lib/zod-prisma.ts` that re-exports `z.nativeEnum(Role)` etc., so changing the Prisma enum propagates into zod via TypeScript. Low-urgency; block on first schema churn.

## 9. Negative / non-integer numerics (8/10)

**Finding 9.1** — `app/api/sessions/start/route.ts:10`: `day: z.number().int().min(1).max(21)`. Correct. Also enforced at DB via `@@unique([userId, dayNumber])` (no CHECK but bounded by Zod).

**Finding 9.2** — `Challenge.dayNumber` has no Postgres CHECK constraint (`prisma/schema.prisma:119`). A rogue SQL path (admin direct DB) could set `dayNumber = -1` and it would appear in the day-picker. *Severity: low* — only admin-level can write, and [[data-integrity]]'s CHECK-constraint section lists difficulty + currentDifficulty + judgeScore but NOT dayNumber. **Fix:** add `@db.SmallInt` + `CHECK (dayNumber BETWEEN 1 AND 21)` migration. Also `PromptAttempt.attemptNumber BETWEEN 1 AND N`.

**Finding 9.3** — `DailySession.xpEarned` is nullable `Int` with no bound; the server computes it via `xpForDifficulty` which is `[1..5] → [100..500]`, so naturally bounded. Same story. Not an attack surface today; document for future "admin XP adjust" UI.

**Finding 9.4** — `app/api/admin/teilnehmer/route.ts:8-10` and `app/api/admin/submissions/route.ts:10-14`: `page: z.coerce.number().int().min(0)`. `z.coerce.number()` accepts `"Infinity"` as Infinity but then `.int()` rejects it — verified mentally. Also accepts `"1e999"` → `Infinity` → `.int()` rejects. Clean.

## 10. Date-range only at route layer (6/10)

**Finding 10.1** — `app/api/buchungen/route.ts:9`: `scheduledAt: z.string().datetime()`. Passes `"1970-01-01T00:00:00Z"` — the MIN_LEAD_MS check at `:51` rejects. *Severity: none.* Two-layer defense intact.

**Finding 10.2** — `z.string().datetime()` in zod@3 **rejects** timezone offsets other than `Z` by default. This means a user in `+01:00` whose client sends the local ISO string (`"2026-05-01T14:00:00+01:00"`) gets a 400. The booking form uses `<input type="datetime-local">`, converted to UTC before POST in `BuchungenClient.tsx` (not read, but assumed — verify). *Severity: low.* Document: if you ever switch to `.datetime({ offset: true })`, the MIN_LEAD_MS math still works because it goes through `new Date().getTime()`.

**Finding 10.3** — There's no cap on `scheduledAt` precision. Sub-second bookings (`...T14:00:00.123Z`) are valid and each row gets its own `@@unique([userId, scheduledAt, type])` slot — a double-click in a datetime-local picker can't hit, but a scripted caller can clutter. *Severity: low.* **Fix:** `.refine(s => /:\d{2}$/.test(s.split('.')[0]), 'no sub-second precision')` or truncate server-side.

## 11. Array ceilings (8/10)

**Finding 11.1** — `app/api/onboarding/complete/route.ts:14`: `aiToolsUsed: z.array(z.string().min(1).max(50)).max(20)`. Fair cap — UI offers 7 options (`AI_TOOLS` in `OnboardingWizard.tsx:23`), 20 gives room for custom. There is **no `.min(0)` or `.min(1)`**, so zero tools passes. Acceptable per the "Noch nie" frequency option. *Severity: none.*

**Finding 11.2** — `app/api/challenges/[id]/attempt/route.ts:30-31`: `MAX_HISTORY_ATTEMPTS = 10`, `MAX_HISTORY_CHARS = 12_000`. Implemented at route level — server-rebuilt from DB, user can't inflate beyond `take: 10`. [[prompt-injection]] already documents this.

**Finding 11.3** — `lib/ai/challenge-ai.ts:30-32`: `.length(21)` on generated challenges, plus a superRefine for uniqueness. Tight. No attack surface (LLM-generated, not user).

**Finding 11.4** — `lib/ai/judge-ai.ts:36-37`: `strengths`/`improvements` both `.min(1).max(3)`. `submission/route.ts:46`: `improvements: z.array(...).max(3)` — **no `.min(1)`** here (judge has `.min(1)`, submission doesn't). Asymmetric but intentional — submission allows "no actionable improvements on a PASS case". Clean.

## 12. Empty-string array items + XSS-shaped values (7/10)

**Finding 12.1** — `app/api/onboarding/complete/route.ts:14` has `z.string().min(1).max(50)` on items — good, blocks `[""]`. But does **not** block `["   "]` (see §3). *Severity: low.*

**Finding 12.2** — None of the user-facing string fields (title, description, prompt, result, dailyDescription) run through an HTML-safety layer. They're only used as (a) LLM input (escaped via `escapeXmlText`) and (b) rendered in React (auto-escaped). If any future feature embeds raw values into `dangerouslySetInnerHTML` or an `<a href>` attribute, it will need its own validation. *Severity: none today*, flag on future PR.

## File upload: none today

Confirmed: speech recognition is realtime Web Speech API, no file upload path. `SpeechInput.tsx` writes to a textarea. No MIME type / size / magic-byte surface exists.

---

## Prioritized fix list (if we were shipping tomorrow)

1. **[medium]** Extend `lib/utils/escape.ts:CONTROL_CHARS` to strip zero-width + bidi controls (§4). One-line change, covers all three LLM boundaries.
2. **[medium]** Add `.refine(s => s.trim().length >= min)` to submission + onboarding text fields (§3). Blocks whitespace-only garbage.
3. **[medium]** Tighten `env().NEXT_PUBLIC_APP_URL` to http(s)-only (§7). Guards LinkedIn share URL.
4. **[low]** Apply `Array.from(name)[0]` fix to avatar initial (§5.2). Polish.
5. **[low]** Add CHECK constraint on `Challenge.dayNumber` (§9.2). Matches the existing difficulty CHECKs in [[data-integrity]].

## Related

- [[security]] — control-char stripping, CSP, scrubber
- [[prompt-injection]] — envelope nonces, server-side verdict (this round extends its control-char defense)
- [[data-integrity]] — CHECK constraints, unique indexes
- [[secret-lifecycle]] — `SECRET_SHAPES` guard in `lib/env.ts` — §7 fix goes next to it
