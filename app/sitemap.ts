import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const now = new Date()
  // Only public routes — authed pages are blocked via robots.ts + the
  // route-group metadata robots: { index: false } override.
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ]
}
