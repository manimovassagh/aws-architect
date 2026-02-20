import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE = path.resolve(
  __dirname,
  '../../apps/backend/src/fixtures/sample.tfstate'
);

/** Select fixture file and click Parse to reach the canvas view */
async function uploadAndParse(page: import('@playwright/test').Page) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
}

test.describe('Upload flow', () => {
  test('shows upload area on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/drag & drop/i).first()).toBeVisible();
  });

  test('uploads tfstate and shows canvas', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
  });

  test('canvas renders VPC node after upload', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);

    // Check that at least one VPC node is rendered
    await expect(page.getByText('main-vpc')).toBeVisible({ timeout: 5_000 });
  });

  test('canvas renders multiple resource types', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);

    // Verify key resources are present
    await expect(page.getByText('web-server')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('postgres-db')).toBeVisible();
    await expect(page.getByText('app-alb')).toBeVisible();
  });
});
