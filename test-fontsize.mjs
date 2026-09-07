const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  console.log('=== LOADING sigapapp.vercel.app ===');
  await page.goto('https://sigapapp.vercel.app', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  const title = await page.title();
  console.log('Title:', title);

  // Get H1 font size
  const h1 = await page.$('h1');
  const h1FontSize = h1 ? await h1.evaluate(el => getComputedStyle(el).fontSize) : 'NOT FOUND';
  console.log('H1 font-size:', h1FontSize);

  // Get subtitle font size
  const subtitle = await page.$('h1 + p');
  const subFontSize = subtitle ? await subtitle.evaluate(el => getComputedStyle(el).fontSize) : 'NOT FOUND';
  console.log('Subtitle font-size:', subFontSize);

  // Look for accessibility toggle
  const toggleBtn = await page.$$eval('button, [role="checkbox"], [role="switch"]', els =>
    els.map(el => ({ text: el.textContent.trim().substring(0, 40), ariaLabel: el.getAttribute('aria-label'), role: el.getAttribute('role'), class: el.className }))
  );
  console.log('\nAll buttons/switches:', JSON.stringify(toggleBtn, null, 2));

  // Try clicking accessibility toggle if exists
  const accToggle = await page.$('text=/aksesibilitas/i');
  if (accToggle) {
    console.log('\n=== CLICKING ACCESSIBILITY TOGGLE ===');
    await accToggle.click();
    await page.waitForTimeout(2000);

    const h1After = await page.$eval('h1', el => getComputedStyle(el).fontSize);
    const subAfter = await page.$eval('h1 + p', el => getComputedStyle(el).fontSize);
    console.log('H1 font-size AFTER:', h1After);
    console.log('Subtitle font-size AFTER:', subAfter);
  } else {
    console.log('\nNo accessibility toggle found');
  }

  console.log('\n=== ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'No errors captured');

  await browser.close();
})();
