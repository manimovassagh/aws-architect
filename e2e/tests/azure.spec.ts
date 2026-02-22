import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE = path.resolve(
  __dirname,
  '../../apps/backend/src/fixtures/azure-sample.tfstate'
);

/** Upload Azure fixture directly from the landing page */
async function uploadAndParse(page: import('@playwright/test').Page) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
}

test.describe('Azure provider flow', () => {
  test('Azure card is visible on landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Azure' })).toBeVisible();
  });

  test('uploads Azure tfstate and renders VNet', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
    await expect(page.getByText('main-vnet')).toBeVisible({ timeout: 5_000 });
  });

  test('canvas renders multiple Azure resource types', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
    await expect(page.getByText('web-vm')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('demo-sqlserver')).toBeVisible();
    await expect(page.getByText('web-lb')).toBeVisible();
  });
});
