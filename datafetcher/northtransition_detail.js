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

const start = async () => {
  const { count, rows } = await northTransactionDetail.findAndCountAll(
    {
      order: [
        ['trade_date', 'DESC'],
      ],
    },
  );

  let startDate = dayjs().subtract(6, 'month');
  startDate = startDate.set('date', 1);

  if (count === 1) {
    startDate = dayjs(rows[0].trade_date);
    logger.info(`db existed data, the last trade is ${startDate}`);
  } else if (count === 2) {
    startDate = dayjs(rows[0].trade_date).add(1, 'day');
  } else {
    logger.info(`db not existed data, the last trade is ${startDate}`);
  }

  let tmpDay = dayjs();
  const days = [];
  for (tmpDay = startDate; tmpDay.diff(dayjs(), 'day') < 0; tmpDay = tmpDay.add(1, 'day')) {
    days.push(tmpDay.format('YYYYMMDD'));
  }
  const browser = await puppeteer.launch({ headless: false });
  const pendingList = [];
  const workingList = [];
  const batchRunningCnt = 1;
  days.forEach((date) => {
    const scrape = async (d, realBrowser) => {
      workingList.push(d);
      const page = await realBrowser.newPage();
      page.on('response', async (response) => {
        if (response.status() === 200 && response.url().includes(`data_tab_daily_${d}c.js`)) {
          response.text().then(async (body) => {
            // const result = JSON.parse(body.substring(10));
            const result = eval(`(${body.substring(10)})`);
            const finalResult = result.map((data) => {
              const tradeDate = data.date;
              const fullMkt = data.market;
              const values = data.content[0].table.tr;
              const turnoverTrades = values[0].td[0][0];
              const buyTrades = values[1].td[0][0];
              const sellTrades = values[2].td[0][0];
              const sumBuysellAmt = values[3].td[0][0];
              const buyAmt = values[4].td[0][0];
              const sellAmt = values[5].td[0][0];
              const dailyQuotaBalance = values[6] ? values[6].td[0][0] : '0';
              const dailyQuotaBalancePercet = values[7] ? values[7].td[0][0] : '0';
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
                fullMkt,
              };
            });
            await blukInsertSecurity(normalizeArray(finalResult));
            // remove the runed date.
            if (!page.isClosed()) {
              await page.close();
            }

            const index = workingList.indexOf(d);
            workingList.splice(index, 1);
            // await scrape(pendingList.shift(), realBrowser);
            if (pendingList.length > 0) {
              const targetDate = pendingList.shift();
              await scrape(targetDate, realBrowser);
            } else {
              await realBrowser.close();
            }
          });
        } else if (pendingList.length === 0) {
          await page.close();
        } else {
          await page.close();
          const targetDate = pendingList.shift();
          await scrape(targetDate, realBrowser);
        }
      });

      // 开始浏览
      try {
        await page.goto(`https://www.hkex.com.hk/chi/csm/DailyStat/data_tab_daily_${d}c.js`);
      } catch (err) {
        //
      } finally {
        //
      }
    };

    if (workingList.length >= batchRunningCnt) {
      pendingList.push(date);
    } else {
      scrape(date, browser);
    }
  });
};

(async () => {
  await start();
})();
