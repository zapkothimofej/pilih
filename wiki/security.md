---
title: Security Posture
type: concept
---

# Security

What hardens PILIH against the obvious and not-so-obvious attacks.

## Env validation

`lib/env.ts` parses `process.env` with a zod schema. Required in prod: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`. `instrumentation.ts` calls `env()` once at server boot so misconfigured deploys fail loudly in the deploy log rather than at first user request.

Anti-pattern killed: every AI client used to read `process.env.ANTHROPIC_API_KEY` directly, which passed `undefined` to the SDK constructor and surfaced as a generic 401 on first call. All three clients (judge, challenge, submission) now flow through `env().ANTHROPIC_API_KEY`.

See also: [[auth-flow]], [[next16-proxy]].

## CSP

Next.js config emits strict Content-Security-Policy headers. Production drops `'unsafe-eval'`; keeps `'unsafe-inline'` on scripts because Next emits inline hydration `<script>` tags (nonce-based is a larger refactor).

```
script-src 'self' 'unsafe-inline'        # prod
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
connect-src 'self' https://api.anthropic.com https://*.clerk.accounts.dev
frame-ancestors 'none'
upgrade-insecure-requests
```

`Permissions-Policy` locks everything except `microphone=(self)` — required by the onboarding `SpeechInput` component.

## PII scrub in logs

`lib/utils/log.ts::scrubString` redacts before `console.error`:
- Anthropic API keys (`sk-ant-…`, also generic `sk-…`)
- Postgres URLs
- Email addresses
- Clerk IDs (`user_…`, `sess_…`, `org_…`)
- Bearer tokens
- Svix signature values (`v1,…`)

`logError` walks nested objects up to depth 5 and scrubs both `.message` and `.stack` on `Error` instances — Prisma packs the offending column value into the stack frame.

## CSRF

`lib/utils/csrf.ts::assertSameOrigin(req)` rejects requests whose `Origin` doesn't match `Host`. Applied to every mutating POST/PATCH handler (9 routes). Modern browsers always send `Origin` on mutating verbs, so a missing header is itself suspicious. See [[csrf-origin-guard]].

## XML envelope hardening

User-supplied strings embedded in LLM prompts are wrapped in nonce-suffixed tags:

```
<user_prompt_eval-3f9a72>
{{ escapeXmlText(userPrompt) }}
</user_prompt_eval-3f9a72>
```

6-byte nonce = 2^48 guesses for an attacker to close the envelope early. `escapeXmlText` also strips XML-1.0 forbidden control chars so `\x00` pastes can't truncate the envelope in the tokenizer. See [[prompt-injection]].

## Related

- [[prompt-injection]] — judge-specific defense-in-depth
- [[auth-flow]] — testing-mode + fail-closed proxy
- [[data-integrity]] — DB-layer guarantees
