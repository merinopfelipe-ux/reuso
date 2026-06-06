const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  const destDir = '/Users/merinop/.gemini/antigravity-ide/brain/3a9c7388-bb03-4f6d-b5a6-947e6a6d5bd9';
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const pagesToCapture = [
    { name: 'home', url: 'http://localhost:3000/' },
    { name: 'pivot-roadmap', url: 'http://localhost:3000/pivot-roadmap' },
    { name: 'sistema-diseno', url: 'http://localhost:3000/sistema-diseno' }
  ];

  for (const item of pagesToCapture) {
    console.log(`Navigating to ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Allow hydration
      
      // Capture default view
      let screenshotPath = path.join(destDir, `${item.name}_default.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);

      // Try to find a theme toggle and click it to toggle day/night mode
      if (item.name === 'pivot-roadmap') {
        // Find toggle button and toggle it
        // The theme toggle button might have aria-label or specific classes
        const toggleBtn = page.locator('button[title*="modo"], button[aria-label*="tema"]');
        if (await toggleBtn.count() > 0) {
          console.log(`Clicking theme toggle on ${item.name}...`);
          await toggleBtn.first().click();
          await page.waitForTimeout(1000);
          screenshotPath = path.join(destDir, `${item.name}_toggled.png`);
          await page.screenshot({ path: screenshotPath });
          console.log(`Saved screenshot (toggled) to ${screenshotPath}`);
        }
      } else if (item.name === 'sistema-diseno') {
        const toggleBtn = page.locator('button[aria-label*="tema"], .theme-toggle-circle');
        if (await toggleBtn.count() > 0) {
          console.log(`Clicking theme toggle on ${item.name}...`);
          await toggleBtn.first().click();
          await page.waitForTimeout(1000);
          screenshotPath = path.join(destDir, `${item.name}_toggled.png`);
          await page.screenshot({ path: screenshotPath });
          console.log(`Saved screenshot (toggled) to ${screenshotPath}`);
        }
      }
    } catch (err) {
      console.error(`Error capturing ${item.name}:`, err);
    }
  }

  await browser.close();
}

run();
