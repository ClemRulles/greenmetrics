import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3003/en', { waitUntil: 'networkidle' });
  const el = await page.$('#landing-hero');
  if (el) {
    const box = await el.boundingBox();
    if (box) {
      await page.screenshot({ path: '/tmp/hero-screenshot.png', clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: Math.min(box.width + 80, 1200), height: Math.min(box.height + 160, 800) } });
      console.log('screenshot saved /tmp/hero-screenshot.png');
      await browser.close();
      process.exit(0);
    }
  }
  await page.screenshot({ path: '/tmp/hero-screenshot.png', fullPage: true });
  console.log('screenshot saved full /tmp/hero-screenshot.png');
  await browser.close();
})();
