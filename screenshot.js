const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 750, height: 900 });
  const fileUrl = 'file://' + path.resolve(__dirname, 'index.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot-full.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
