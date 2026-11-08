import { test, expect } from '@playwright/test';

test('app shell loads and switches language', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.getByLabel(/ភាសា|Language/).selectOption('en');
  await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();
});

test('unknown route shows 404', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByText('404')).toBeVisible();
});
