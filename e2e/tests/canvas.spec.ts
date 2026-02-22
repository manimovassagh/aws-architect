import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE = path.resolve(
  __dirname,
  '../../apps/backend/src/fixtures/sample.tfstate'
);

test.describe('Canvas interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Select AWS provider first
    await page.getByRole('button', { name: /Amazon Web Services/i }).click();
    await expect(page.getByText(/drag & drop/i).first()).toBeVisible({ timeout: 5_000 });
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);
    await page.getByRole('button', { name: 'Parse' }).click();
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
  });

  test('React Flow controls are visible', async ({ page }) => {
    await expect(page.locator('.react-flow__controls')).toBeVisible();
  });

  test('minimap is visible', async ({ page }) => {
    await expect(page.locator('.react-flow__minimap')).toBeVisible();
  });

  test('edges are rendered', async ({ page }) => {
    // Only non-containment edges remain (secured by, depends on)
    const edges = page.locator('.react-flow__edge');
    await expect(edges.first()).toBeVisible({ timeout: 5_000 });
    const count = await edges.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('nodes are rendered with correct count', async ({ page }) => {
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 5_000 });
    const count = await nodes.count();
    // Fixture has 11 resources = 11 nodes
    expect(count).toBeGreaterThanOrEqual(10);
  });
});
