import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE = path.resolve(
  __dirname,
  '../../apps/backend/src/fixtures/gcp-sample.tfstate'
);

async function selectGcpProvider(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Google Cloud Platform/i }).click();
  await expect(page.getByText(/drag & drop/i).first()).toBeVisible({ timeout: 5_000 });
}

async function uploadAndParse(page: import('@playwright/test').Page) {
  await selectGcpProvider(page);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
}

test.describe('GCP provider flow', () => {
  test('GCP card is enabled on provider selection page', async ({ page }) => {
    await page.goto('/');
    const gcpButton = page.getByRole('button', { name: /Google Cloud Platform/i });
    await expect(gcpButton).toBeVisible();
    await expect(gcpButton).toBeEnabled();
  });

  test('shows upload area after selecting GCP', async ({ page }) => {
    await page.goto('/');
    await selectGcpProvider(page);
    await expect(page.getByText(/drag & drop/i).first()).toBeVisible();
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
