import { test, expect } from '@playwright/test';

test('game loads and resources increase', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Check if title is correct
  await expect(page).toHaveTitle(/Von Idle Probes/);

  // Get initial metal value
  const metalElement = page.locator('.resource-card:has-text("Alloy Mass") .resource-amount');
  const initialMetalText = await metalElement.textContent();
  const initialMetal = parseFloat(initialMetalText || '0');

  // Wait for a few seconds for the game loop to run
  await page.waitForTimeout(2000);

  // Get metal value again
  const currentMetalText = await metalElement.textContent();
  const currentMetal = parseFloat(currentMetalText || '0');

  console.log(`Initial Metal: ${initialMetal}, Current Metal: ${currentMetal}`);
  expect(currentMetal).toBeGreaterThan(initialMetal);

  // Verify interaction: Click "Fabricate" for "Survey Probe"
  const probeCountElement = page.locator('.unit-card:has-text("Survey Probe") .unit-count');
  const initialProbeCountText = await probeCountElement.textContent();
  const initialProbeCount = parseInt(initialProbeCountText?.replace('x', '') || '0');

  const fabricateButton = page.locator('.unit-card:has-text("Survey Probe") button:has-text("Fabricate")');
  await fabricateButton.click();

  const currentProbeCountText = await probeCountElement.textContent();
  const currentProbeCount = parseInt(currentProbeCountText?.replace('x', '') || '0');

  console.log(`Initial Probes: ${initialProbeCount}, Current Probes: ${currentProbeCount}`);
  expect(currentProbeCount).toBe(initialProbeCount + 1);
});
