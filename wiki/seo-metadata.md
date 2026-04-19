---
title: SEO, Open Graph, Metadata
type: review
round: 7
---

# SEO, Open Graph & Metadata Review (Round 7)

Focus: what search engines, social previews, and PWA installers see. The project is a **DE-only** SaaS for the "KI-Führerschein" term. Landing is the only meaningful SEO surface — all authed routes (`/dashboard`, `/challenge/*`, `/zertifikat`, `/abschluss`, `/onboarding`, `/fortschritt`, `/einstellungen`, `/buchung`, `/admin/*`, `/super-admin`) must stay out of the index. Today they are not excluded at all.

See [[copy-tonality]] for the brand voice that drives titles/descriptions, and [[next16-proxy]] for the Next 16 file conventions that replace the legacy `pages/_document` era.

## TL;DR scores

| # | Dimension                               | Score |
|---|-----------------------------------------|-------|
| 1 | Sitemap.xml / robots.txt                | 2/10  |
| 2 | Open Graph image                        | 3/10  |
| 3 | Per-page metadata                       | 3/10  |
| 4 | theme-color / colorScheme               | 9/10  |
| 5 | Canonical URL / metadataBase            | 3/10  |
| 6 | Structured data (JSON-LD schema.org)    | 1/10  |
| 7 | hreflang / `<html lang>`                | 9/10  |
| 8 | Robots indexing of authed pages         | 2/10  |
| 9 | Per-page descriptions                   | 4/10  |
| 10| Favicon / apple-touch-icon              | 4/10  |
| 11| PWA manifest.webmanifest                | 2/10  |

Average: **3.8/10**. The root layout metadata is tidy but shallow; everything downstream of it is missing.

## 1. Sitemap & robots — 2/10

Neither `app/sitemap.ts` nor `app/robots.ts` exists (checked via `Glob: app/{sitemap,robots,manifest}.{ts,tsx,xml,txt,json}` — no matches). Next 16 supports file-based conventions for both (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`, `robots.md`).

- **Finding 1.1** [high] — No `app/robots.ts`. Crawlers get the Next.js default (allow all). That means `/dashboard`, `/challenge/42?session=…`, `/zertifikat` are all crawlable once linked externally (e.g. from a user's LinkedIn certificate share). Fix: `app/robots.ts` with `allow: ['/', '/impressum', '/datenschutz']` and `disallow: ['/dashboard', '/challenge/', '/zertifikat', '/abschluss', '/onboarding', '/fortschritt', '/einstellungen', '/buchung', '/admin/', '/super-admin', '/api/']`, plus `sitemap: ${env().NEXT_PUBLIC_APP_URL}/sitemap.xml`.
- **Finding 1.2** [high] — No `app/sitemap.ts`. The landing page is the one URL that *should* be in the index, and Google has to discover it organically. Fix: emit `/`, `/impressum`, `/datenschutz` with `changeFrequency: 'monthly'` and `priority: 1 / 0.3 / 0.3`. Use `env().NEXT_PUBLIC_APP_URL` — the zod schema (`lib/env.ts:25-31,53-60`) already enforces http(s) in prod, so the value is safe to concatenate.
- **Finding 1.3** [medium] — `proxy.ts:35` matcher excludes `.webmanifest` but not `.xml`/`.txt`. That is fine for file-convention routes (they are framework-served) but worth a comment so a future dev doesn't "fix" the matcher.

## 2. Open Graph image — 3/10

`app/layout.tsx:20-24` sets `twitter.card: 'summary_large_image'` but `openGraph.images` is not set anywhere in the tree. `Glob **/opengraph-image*` returns only the Next.js docs file. Result: every share preview (Slack, LinkedIn, X, WhatsApp, iMessage) falls back to a blank rectangle.

- **Finding 2.1** [high] — Add `app/opengraph-image.tsx` using `ImageResponse` from `next/og`. Use the brand palette (`var(--bg-base)` = `#0a0a0b`, accent from `globals.css`) and the tagline "Prompt it like it's hot" from [[copy-tonality]]. 1200×630, under 8 MB. Next auto-inserts `og:image`, `og:image:width`, `og:image:height`, `og:image:type`.
- **Finding 2.2** [high] — Add `app/twitter-image.tsx` (or reuse the OG one — Next deduplicates if both point to the same generator). Right now the `summary_large_image` card shape ships without the image URL the card type promises, which X / Mastodon flag as a broken card.
- **Finding 2.3** [medium] — Add `app/opengraph-image.alt.txt` with something like "PILIH — 21-Tage KI-Führerschein" so screen readers and bots get the alt text. Deaf/low-vision LinkedIn users currently see nothing.

## 3. Per-page metadata — 3/10

`Grep "export const metadata"` returns exactly one hit: `app/layout.tsx:8`. The `%s · PILIH` template is therefore never filled — every page in the app ships with the default title `PILIH — Prompt it like it's hot`.

- **Finding 3.1** [medium] — Public-facing `/` (landing) has no explicit `export const metadata` in `app/page.tsx`, so OG values match the site default. That is OK for the landing, but the canonical URL and JSON-LD (see §5, §6) want their own block.
- **Finding 3.2** [low-medium] — Authed pages (`app/(app)/dashboard/page.tsx`, `app/(app)/fortschritt/page.tsx`, `app/(app)/einstellungen/page.tsx`, `app/(app)/zertifikat/page.tsx`, …) should each `export const metadata = { title: 'Dashboard', robots: { index: false, follow: false } }`. The template fills in `Dashboard · PILIH` for tab titles and the `robots: noindex` cascades to any stray crawl.
- **Finding 3.3** [medium] — The legal routes `/impressum` and `/datenschutz` are linked from `app/page.tsx:54-55` but no folders exist under `app/` (`Glob **/impressum/**` empty). These 404 today, which Google will flag as "Submitted URL not found (404)" the moment a sitemap lists them. Either stub the pages or remove the links until the legal review lands.

## 4. theme-color / colorScheme — 9/10

`app/layout.tsx:28-31`:

```ts
export const viewport: Viewport = {
  themeColor: '#18191d',
  colorScheme: 'dark',
}
```

Clean, colocated, uses the Next 16 `Viewport` export (not the deprecated `metadata.themeColor`). Matches `var(--bg-surface)`.

- **Finding 4.1** [low] — Consider a media-query variant: `themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#18191d' }]`. The app is dark-only today, but the pattern is cheap insurance for a future light theme and is explicitly supported by the `Viewport` type.
- **Finding 4.2** [nit] — `colorScheme: 'dark'` tells browsers to render form controls / scrollbars in dark. Good. No action.

## 5. Canonical URL / metadataBase — 3/10

No `metadataBase` on `app/layout.tsx`. That means every `openGraph.url` / `alternates.canonical` Next tries to resolve relative URLs against falls back to `http://localhost:3000` in build logs (plus a warning) and to the current request origin at runtime — *including* preview deploys and custom domains, which split the canonical signal across hosts.

- **Finding 5.1** [high] — Add `metadataBase: new URL(env().NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')` to `app/layout.tsx:8`. The env var is already validated http(s) in prod (`lib/env.ts:28-30`). This single line fixes the Next build warning and anchors every derived absolute URL.
- **Finding 5.2** [medium] — Add `alternates: { canonical: '/' }` to `app/page.tsx` metadata. The landing is the canonical SEO surface and must not be indexed under `utm_*` or `?ref=` variants.
- **Finding 5.3** [low] — For auth pages that redirect (`app/(auth)/sign-in/[[...sign-in]]/page.tsx:5` — just `redirect('/dashboard')`), also emit `robots: { index: false }` so the brief pre-redirect HTML is never cached.

## 6. Structured data — 1/10

`Grep "application/ld\+json"` returns zero hits. The "KI-Führerschein" term is what PILIH wants to own — schema.org `Course` is literally designed for this.

- **Finding 6.1** [high] — In `app/page.tsx`, inject a `<script type="application/ld+json">` with a `Course` node: `name: 'KI-Führerschein'`, `description: '21-Tage Prompt-Engineering-Kurs.'`, `provider: { '@type': 'Organization', name: 'Yesterday Academy', url: ... }`, `hasCourseInstance: { courseMode: 'online', courseWorkload: 'PT21D' }`. Use `dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}`. This surfaces rich-result eligibility on Google for course queries.
- **Finding 6.2** [medium] — Add an `Organization` JSON-LD node with `name: 'Yesterday Academy'`, `url: NEXT_PUBLIC_APP_URL`, `sameAs: [linkedin, x, …]` once those exist. Helps Google's knowledge panel.
- **Finding 6.3** [low] — Each completed `/zertifikat` could emit a `LearningResource`/`EducationalOccupationalCredential` node — but that page is `noindex` (Finding 8.1), so de-prioritise until public verification URLs exist.

## 7. hreflang & `<html lang>` — 9/10

`app/layout.tsx:35` — `<html lang="de">`. `openGraph.locale: 'de_DE'` (`app/layout.tsx:18`). The product is DE-only and every string in the codebase is `du` / `dein` per [[copy-tonality]].

- **Finding 7.1** [nit] — No `alternates.languages` needed while DE is the only locale. If/when `/en` ships, add `alternates: { languages: { 'de-DE': '/', 'x-default': '/', 'en-US': '/en' } }`.
- **Finding 7.2** [low] — `<html lang="de">` is ISO-639-1 and Google accepts it; Bing prefers `de-DE`. Swap if the BR/CH split ever matters.

## 8. Authed-page robots leak — 2/10

`app/layout.tsx:25` — `robots: { index: true, follow: true }` applies to every descendant unless overridden. No descendant overrides it. So:

- `/dashboard` → indexable. Renders the user's name in `<h1>` (`app/(app)/dashboard/page.tsx:59`).
- `/challenge/[id]?session=…` → indexable. Leaks challenge content + session IDs in a Google cache.
- `/zertifikat` → indexable. Leaks user name + score.
- `/admin`, `/super-admin` → indexable (though gated server-side, the 403/redirect HTML is still cacheable under some bot paths).

In practice, Clerk session cookies block most bots — but a logged-in user sharing a URL on LinkedIn is enough to leak it, and `ALLOW_TESTING_AUTH=true` preview deploys (`proxy.ts:10`) serve these routes to anyone.

- **Finding 8.1** [high] — Add `metadata.robots = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }` to `app/(app)/layout.tsx:5` and `app/(admin)/layout.tsx:5`. Route-group layouts cascade to every page below. One edit per group covers the entire authed surface.
- **Finding 8.2** [high] — Same treatment for `app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `sign-up`. Sign-up pages are indexed by default and bounce Google to a redirect — classic soft-404.
- **Finding 8.3** [medium] — `app/not-found.tsx` should set `robots: { index: false }` so Google doesn't index the 404 body as a real page. Belt-and-braces with the 404 status code.

## 9. Per-page descriptions — 4/10

Root description: `'21-Tage KI-Führerschein: Lerne Prompt Engineering für deinen Job.'` (`app/layout.tsx:13`). Decent but generic. The `%s · PILIH` title template never fires because no child page exports metadata (§3).

- **Finding 9.1** [medium] — Landing deserves a richer description (~140-160 chars) with keywords: "PILIH — der 21-Tage KI-Führerschein von Yesterday Academy. Lern Prompt Engineering für deinen Job mit täglichen Challenges, persönlichem Feedback und Zertifikat." Override in `app/page.tsx`.
- **Finding 9.2** [low] — `/impressum` and `/datenschutz` (once built) should set `robots: { index: true }` but explicit descriptions to avoid Google auto-excerpting noise.

## 10. Favicon / apple-touch-icon — 4/10

Only `app/favicon.ico` exists (`Bash ls /app` confirms). No `app/icon.{png,svg}`, no `app/apple-icon.png`. iOS home-screen adds show the generic web-clip; Android high-DPI gets a pixelated icon.

- **Finding 10.1** [medium] — Add `app/apple-icon.png` (180×180, per MDN/`app-icons.md`). Users pinning PILIH to the iOS home screen today get a screenshot thumbnail.
- **Finding 10.2** [medium] — Add `app/icon.svg` as a scalable master — Next generates PNG fallbacks. The `PilihMark` component (`components/ui/icons`, used in `app/page.tsx:3,16`) is SVG already; lift the path into a standalone file.
- **Finding 10.3** [low] — Consider `app/icon.png` at 32×32 and 192×192 as numbered icons (`icon1.png`, `icon2.png`) — browsers pick the best size. The generated SVG route works too, but static files are cheaper.

## 11. PWA manifest — 2/10

No `app/manifest.ts`. Android Chrome's "Install app" prompt is disabled; "Add to Home Screen" uses the favicon.

- **Finding 11.1** [medium] — Add `app/manifest.ts` returning `MetadataRoute.Manifest`. Shape:

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PILIH — KI-Führerschein',
    short_name: 'PILIH',
    description: '21-Tage KI-Führerschein.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#18191d',
    lang: 'de',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
```

The `proxy.ts:35` matcher already excludes `.webmanifest` (good).
- **Finding 11.2** [low] — Real PWA-ness (offline, service worker) is out of scope — the app is session-cookie + DB heavy — but a manifest alone unlocks install UX and better OS-level branding.

## Priority fix list

| Rank | Action                                                                 | Files                                                                |
|------|------------------------------------------------------------------------|----------------------------------------------------------------------|
| P0   | `robots: { index: false }` on `(app)/layout.tsx` + `(admin)/layout.tsx` | `app/(app)/layout.tsx:5`, `app/(admin)/layout.tsx:5`                 |
| P0   | Add `metadataBase` to root metadata                                     | `app/layout.tsx:8`                                                   |
| P0   | Create `app/opengraph-image.tsx` + `app/twitter-image.tsx`              | new                                                                  |
| P1   | Create `app/robots.ts` + `app/sitemap.ts`                               | new                                                                  |
| P1   | Add `Course` JSON-LD to landing                                         | `app/page.tsx`                                                       |
| P1   | Create `app/apple-icon.png` + `app/icon.svg`                            | new                                                                  |
| P2   | Create `app/manifest.ts`                                                | new                                                                  |
| P2   | Per-page `metadata` + `alternates.canonical: '/'`                       | `app/page.tsx`                                                       |
| P2   | Stub `/impressum` + `/datenschutz` or remove footer links               | `app/page.tsx:54-55`                                                 |

## Related

- [[copy-tonality]] — tagline, description tone, "KI-Führerschein" / "Prompt it like it's hot"
- [[next16-proxy]] — why file-convention routes (`sitemap.ts`, `robots.ts`, `manifest.ts`) work out-of-the-box alongside `proxy.ts`
- [[security]] — `env().NEXT_PUBLIC_APP_URL` shape guarantee for canonical construction
- [[a11y-patterns]] — `opengraph-image.alt.txt` ties in with screen-reader considerations for shared previews
