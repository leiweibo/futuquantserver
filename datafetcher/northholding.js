const dayjs = require('dayjs');
const puppeteer = require('puppeteer');
const winston = require('winston');
const { Op } = require('sequelize');
const { northHolding, normalizeArray } = require('../database/models/NorthHolding');
const { puppeteerConfig } = require('../helpers/puppeteerhelper');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

const blukInsertSecurity = async (dataArray) => {
  try {
    if (dataArray && dataArray.length > 0) {
      const latestRecord = await northHolding.findOne(
        {
          where: {
            trade_date: {
              [Op.eq]: dayjs(dataArray[0].trade_date).format('YYYY-MM-DD'),
            },
            security_mkt: dataArray[0].security_mkt,
          },
          order: [
            ['trade_date', 'DESC'],
          ],
        },
      );
      if (latestRecord) {
        logger.info(`bulk inserted ${dataArray[0].trade_date}, ${dataArray[0].security_mkt}, data exists and no data inserted.`);
      } else {
        await northHolding.bulkCreate(dataArray);
        logger.info(`bulk inserted ${dataArray[0].trade_date}, ${dataArray[0].security_mkt}, and length is ${dataArray.length}`);
      }
    }
  } catch (error) {
    logger.error(error.stack);
  }
};

const startNorthHolding = async (targetMkt) => {
  const latestRecord = await northHolding.findOne(
    {
      where: {
        security_mkt: targetMkt === 'sz' ? 22 : 21,
      },
      order: [
        ['trade_date', 'DESC'],
      ],
    },
  );

  let startDate = dayjs().subtract(1, 'year');
  if (latestRecord) {
    startDate = dayjs(latestRecord.trade_date);
    logger.info(`db existed data, the last trade is ${startDate}`);
  } else {
    logger.info(`db not existed data, the last trade is ${startDate}`);
  }

  let tmpDay = dayjs();
  const days = [];
  for (tmpDay = startDate; tmpDay.diff(dayjs(), 'day') < 0; tmpDay = tmpDay.add(1, 'day')) {
    days.push(tmpDay.format('YYYY/MM/DD'));
  }

  const browser = await puppeteer.launch(puppeteerConfig);
  const pendingList = [];
  const workingList = [];
  const batchRunningCnt = 1;
  days.forEach((date) => {
    const scrape = async (d, realBrowser, market) => {
      workingList.push(d);
      const page = await realBrowser.newPage();
      await page.goto(`https://www.hkexnews.hk/sdw/search/mutualmarket_c.aspx?t=${market}`, { waitUntil: 'load', timeout: 0 });
      await page.evaluate((realDate) => {
        document.querySelector('#txtShareholdingDate').value = realDate;
        document.querySelector('#btnSearch').click();
      }, d);

      await page.waitForNavigation();
      const result = await page.evaluate((realMkt) => {
        const stkList = [];
        document.querySelectorAll('#mutualmarket-result > tbody > tr').forEach((el) => {
          const code = el.children[0].innerText;
          const name = el.children[1].innerText;
          const amt = el.children[2].innerText;
          const amtPer = el.children[3].innerText;
          const mkt = realMkt === 'sz' ? 22 : 21;
          const tmpDate = document.querySelector('#txtShareholdingDate').value;
          stkList.push(
            {
              tmpDate, code, name, amt, amtPer, mkt,
            },
          );
        });
        return stkList;
      }, market);
      await blukInsertSecurity(normalizeArray(result));
      // remove the runed date.
      const index = workingList.indexOf(d);
      workingList.splice(index, 1);
      await page.close();
      // await scrape(pendingList.shift(), realBrowser);
      if (pendingList.length > 0) {
        const targetDate = pendingList.shift();
        await scrape(targetDate, realBrowser, market);
      } else if (workingList.length === 0) {
        await realBrowser.close();
      }
    };

    if (workingList.length >= batchRunningCnt) {
      pendingList.push(date);
    } else {
      scrape(date, browser, targetMkt);
    }
  });
};

// (async () => {
//   await startNorthHolding('sh');
//   await startNorthHolding('sz');
// })();

module.exports = { startNorthHolding };
