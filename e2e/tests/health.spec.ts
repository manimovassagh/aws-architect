import { test, expect } from '@playwright/test';

test.describe('Health checks', () => {
  test('backend /health returns 200', async ({ request }) => {
    const res = await request.get('http://localhost:3001/health');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
  });

  test('backend /docs (Swagger) is accessible', async ({ request }) => {
    const res = await request.get('http://localhost:3001/docs/');
    expect(res.ok()).toBe(true);
  });

  test('frontend loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/InfraGraph/i);
  });
});
