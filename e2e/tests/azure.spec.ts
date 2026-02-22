import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE = path.resolve(
  __dirname,
  '../../apps/backend/src/fixtures/azure-sample.tfstate'
);

async function selectAzureProvider(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Microsoft Azure/i }).click();
  await expect(page.getByText(/drag & drop/i).first()).toBeVisible({ timeout: 5_000 });
}

async function uploadAndParse(page: import('@playwright/test').Page) {
  await selectAzureProvider(page);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
}

test.describe('Azure provider flow', () => {
  test('Azure card is enabled on provider selection page', async ({ page }) => {
    await page.goto('/');
    const azureButton = page.getByRole('button', { name: /Microsoft Azure/i });
    await expect(azureButton).toBeVisible();
    await expect(azureButton).toBeEnabled();
  });

  test('shows upload area after selecting Azure', async ({ page }) => {
    await page.goto('/');
    await selectAzureProvider(page);
    await expect(page.getByText(/drag & drop/i).first()).toBeVisible();
  });

  test('uploads Azure tfstate and renders VNet', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
    await expect(page.getByText('main-vnet')).toBeVisible({ timeout: 5_000 });
  });

  test('canvas renders multiple Azure resource types', async ({ page }) => {
    await page.goto('/');
    await uploadAndParse(page);
    await expect(page.getByText('web-vm')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('demo-sqlserver')).toBeVisible();
    await expect(page.getByText('web-lb')).toBeVisible();
  });
});
