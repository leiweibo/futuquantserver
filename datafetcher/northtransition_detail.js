const dayjs = require('dayjs');
const puppeteer = require('puppeteer');
const winston = require('winston');
const { Op } = require('sequelize');
const { northTransactionDetail, normalizeArray } = require('../database/models/NorthTransactionDetail');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

const blukInsertSecurity = async (dataArray) => {
  try {
    if (dataArray && dataArray.length > 0) {
      const latestRecord = await northTransactionDetail.findOne(
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
        await northTransactionDetail.bulkCreate(dataArray);
        logger.info(`bulk inserted ${dataArray[0].trade_date}, ${dataArray[0].security_mkt}, and length is ${dataArray.length}`);
      }
    }
  } catch (error) {
    logger.error(error.stack);
  }
};

const start = async (targetMkt) => {
  const latestRecord = await northTransactionDetail.findOne(
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
  const browser = await puppeteer.launch({ headless: false });
  const pendingList = [];
  const workingList = [];
  const batchRunningCnt = 1;
  days.forEach((date) => {
    const scrape = async (d, realBrowser, market) => {
      workingList.push(d);
      const page = await realBrowser.newPage();
      const dayObj = dayjs();
      const day = dayObj.date() - 1;
      const year = 0;
      const month = dayObj.month();
      const mkt = (targetMkt === 'sz' ? 2 : 0);
      await page.goto(`https://www.hkex.com.hk/Mutual-Market/Stock-Connect/Statistics/Historical-Daily?sc_lang=zh-HK#select4=1&select5=${mkt}&select3=${year}&select1=${day}&select2=${month}`, { waitUntil: 'load', timeout: 0 });
      await page.evaluate((realDate) => {
        document.querySelector('#txtShareholdingDate').value = realDate;
        document.querySelector('#btnSearch').click();
      }, d);

      await page.waitForNavigation();
      const result = await page.evaluate((realMkt) => {
        const tradeDate = document.querySelector('.csmStatTimeContainer').children[0].innerText;
        const rows = document.querySelectorAll('.migrate-table__noheader > tbody > tr');
        const turnoverTrades = rows[0].children[1].innerText;
        const buyTrades = rows[1].children[1].innerText;
        const sellTrades = rows[2].children[1].innerText;
        const sumBuysellAmt = rows[3].children[1].innerText;
        const buyAmt = rows[4].children[1].innerText;
        const sellAmt = rows[5].children[1].innerText;
        const dailyQuotaBalance = rows[6].children[1].innerText;
        const dailyQuotaBalancePercet = rows[7].children[1].innerText;
        return {
          tradeDate,
          turnoverTrades,
          buyTrades,
          sellTrades,
          sumBuysellAmt,
          buyAmt,
          sellAmt,
          dailyQuotaBalance,
          dailyQuotaBalancePercet,
          realMkt,
        };
      }, market);
      await blukInsertSecurity(normalizeArray([result]));
      // remove the runed date.
      const index = workingList.indexOf(d);
      workingList.splice(index, 1);
      await page.close();
      // await scrape(pendingList.shift(), realBrowser);
      if (pendingList.length > 0) {
        const targetDate = pendingList.shift();
        await scrape(targetDate, realBrowser, market);
      } else {
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

(async () => {
  await start('sh');
  // await start('sz');
})();
