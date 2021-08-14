const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const puppeteer = require('puppeteer');
// const axios = require('axios');
const { puppeteerConfig } = require('../../helpers/puppeteerhelper');

dayjs.extend(utc);
dayjs.extend(timezone);

const xueqiuClient = async (stkCode, startDate, endDate) => {
  const browser = await puppeteer.launch(puppeteerConfig);

  const page = await browser.newPage();
  // 开始浏览
  await page.goto('https://xueqiu.com', { waitUntil: 'load', timeout: 0 });
  // const d = dayjs().format('YYYYMMDD');
  // const d = '20210802';
  const count = dayjs(startDate).diff(endDate, 'day');

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.url().includes('ico')) {
      await request.abort();
    } else {
      await request.continue();
    }
  });

  const url = `https://stock.xueqiu.com/v5/stock/chart/kline.json?symbol=${stkCode}&begin=${dayjs(endDate).valueOf()}&period=day&type=before&count=${count}&indicator=kline,pe,pb,ps,pcf,market_capital,agt,ggt,balance`
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 0 });
  const jsonRes = await resp.json();
  await browser.close();
  return jsonRes;
};

xueqiuClient('SH510050', '2021-07-01', '2021-08-01');

module.exports = { xueqiuClient };
