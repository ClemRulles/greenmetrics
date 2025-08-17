import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    const res = await page.goto('http://localhost:3001/en', { waitUntil: 'networkidle' });
    console.log('page status', res.status());
    if (errors.length) {
      console.error('console errors:', errors);
      process.exit(2);
    }
    console.log('no console errors');
  } catch (err) {
    console.error('navigation error', err && err.message);
    process.exit(3);
  } finally {
    await browser.close();
  }
})();
