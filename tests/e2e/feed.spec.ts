import { test, expect } from '@playwright/test';

test('homepage loads and shows brand', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Verify the page title or basic rendering is visible
  const header = page.locator('h1');
  await expect(header).toBeVisible();

  // It should show either "Weekend Dump" or "Weekday Dump"
  const headerText = await header.textContent();
  expect(headerText).toMatch(/(Weekend Dump|Weekday Dump)/i);
});

test('can type in post form', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Locate the textarea using placeholder or generic selector
  const textarea = page.locator('textarea[placeholder*="What happens this weekend"]');
  // It might not exist if we changed the placeholder, let's use standard textbox
  const fallbackTextarea = page.locator('textarea').first();

  await expect(fallbackTextarea).toBeVisible();
  await fallbackTextarea.fill('This is a test dump using Playwright! #e2e');
  
  const content = await fallbackTextarea.inputValue();
  expect(content).toBe('This is a test dump using Playwright! #e2e');
});
