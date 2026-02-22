import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE = path.resolve(
  __dirname,
  '../../apps/backend/src/fixtures/gcp-sample.tfstate'
);

/** Upload GCP fixture directly from the landing page */
async function uploadAndParse(page: import('@playwright/test').Page) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
}

test.describe('GCP provider flow', () => {
  test('GCP card is visible on landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'GCP' })).toBeVisible();
  });

  test('uploads GCP tfstate and renders VPC', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
    await expect(page.getByText('main-vpc')).toBeVisible({ timeout: 5_000 });
  });

  test('canvas renders multiple GCP resource types', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
    await expect(page.getByText('web-server')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('demo-db')).toBeVisible();
    await expect(page.getByText('web-lb')).toBeVisible();
  });
});
