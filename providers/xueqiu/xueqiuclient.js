const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const puppeteer = require('puppeteer');
// const axios = require('axios');
const { puppeteerConfig } = require('../../helpers/puppeteerhelper');

dayjs.extend(utc);
dayjs.extend(timezone);

const start = async () => {
  const browser = await puppeteer.launch(puppeteerConfig);

  const page = await browser.newPage();
  // 开始浏览
  await page.goto('https://xueqiu.com', { waitUntil: 'load', timeout: 0 });
  // const d = dayjs().format('YYYYMMDD');
  // const d = '20210802';

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.url().includes('ico')) {
      await request.abort();
    } else {
      await request.continue();
    }
  });

  page.on('response', async (response) => {
    console.log(`------> ${response.url()}`);
    response.text().then(async () => {
      console.log('body');
    });
  });

  await page.goto('https://stock.xueqiu.com/v5/stock/chart/kline.json?symbol=SH510050&begin=1629038706391&period=day&type=before&count=-284&indicator=kline,pe,pb,ps,pcf,market_capital,agt,ggt,balance', { waitUntil: 'load', timeout: 0 });
};

start();

module.exports = { start };
