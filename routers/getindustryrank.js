const router = require('koa-router')();
const puppeteer = require('puppeteer');
const { puppeteerConfig } = require('../helpers/puppeteerhelper');

router.get('/:securityCode', async (ctx) => {
  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage();
  const code = ctx.params.securityCode;
  await page.goto(`http://quotes.money.163.com/f10/hydb_${code}.html?order2=zcfzl#cwzb`, { waitUntil: 'load', timeout: 0 });
  const rankRes = await page.evaluate(() => {
    const rankElement = document.getElementById('cwzbChart').nextElementSibling;
    return rankElement.children[0].innerText.replace(/\s+/g, '');
  });
  await browser.close();
  ctx.body = {
    succcess: true,
    msg: 'get rank data success',
    debtRatioRank: rankRes, // 资产负债率行业排行
  };
});

module.exports = router;
