const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const days = ['2021/06/14', '2021/06/15', '2021/06/16', '2021/06/17', '2021/06/18'];
  days.forEach((date) => {
    const scrape = async (d, realBrowser) => {
      const page = await realBrowser.newPage();
      await page.goto('https://www.hkexnews.hk/sdw/search/mutualmarket_c.aspx?t=sz', { waitUntil: 'load', timeout: 0 });
      console.log(d);
      await page.evaluate((realDate) => {
        console.log(`the date is ${realDate}`);
        document.querySelector('#txtShareholdingDate').value = realDate;
        document.querySelector('#btnSearch').click();
      }, d);

      await page.waitForNavigation();
      const result = await page.evaluate(() => {
        const name = document.querySelectorAll('#mutualmarket-result > tbody > tr')[0].children[1].innerText;
        const amt = document.querySelectorAll('#mutualmarket-result > tbody > tr')[0].children[2].innerText;
        const tmpDate = document.querySelector('#txtShareholdingDate').value;
        return { tmpDate, name, amt };
      });

      console.log(result);
      await realBrowser.close();
    };
    scrape(date, browser);
  });
})();
