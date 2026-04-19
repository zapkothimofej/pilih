import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Allow the landing and legal routes. Authed routes are blocked
  // belt-and-braces via per-route-group metadata AND here — crawlers
  // with stale robots.txt cache shouldn't reach them even once.
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/impressum', '/datenschutz'],
        disallow: ['/dashboard', '/challenge', '/fortschritt', '/buchung', '/einstellungen', '/abschluss', '/zertifikat', '/onboarding', '/admin', '/super-admin', '/sign-in', '/sign-up', '/api'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/sitemap.xml`,
  }
}
