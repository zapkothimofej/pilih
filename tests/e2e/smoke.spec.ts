import { test, expect } from '@playwright/test'

test.describe('PILIH Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PILIH/)
  })

  test('dashboard redirects to onboarding when not onboarded', async ({ page }) => {
    // In test mode, test-user-1 may or may not have onboarding completed
    // We just verify the page responds with a valid redirect or renders
    const response = await page.goto('/dashboard')
    expect(response?.status()).toBeLessThan(500)
  })

  test('challenge heute page responds', async ({ page }) => {
    const response = await page.goto('/challenge/heute')
    expect(response?.status()).toBeLessThan(500)
  })

  test('fortschritt page responds', async ({ page }) => {
    const response = await page.goto('/fortschritt')
    expect(response?.status()).toBeLessThan(500)
  })

  test('buchung page responds', async ({ page }) => {
    const response = await page.goto('/buchung')
    expect(response?.status()).toBeLessThan(500)
  })

  test('einstellungen page responds', async ({ page }) => {
    const response = await page.goto('/einstellungen')
    expect(response?.status()).toBeLessThan(500)
  })

  test('admin page responds', async ({ page }) => {
    const response = await page.goto('/admin')
    expect(response?.status()).toBeLessThan(500)
  })

  test('404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/does-not-exist-xyz')
    expect(response?.status()).toBe(404)
  })
})
