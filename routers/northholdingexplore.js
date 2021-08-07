const router = require('koa-router')();
const axios = require('axios');
const dayjs = require('dayjs');

const { Op } = require('sequelize');

const { northHolding } = require('../database/models/NorthHolding');
const { northSecurity } = require('../database/models/NorthSecurity');
const { thriftClient } = require('../providers/baostock/NodeClient');

const limitlessLength = 5000;
const pageByes = 3;

const getMktOnlineDate = async () => {
  const startDate = dayjs().subtract(5, 'week').format('YYYYMMDD');
  const endDate = dayjs().format('YYYYMMDD');
  const URL = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.000001&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&end=${endDate}&lmt=1000000&beg=${startDate}`;
  const klineRes = await axios.get(URL);
  const { data } = klineRes;
  const dates = data.data.klines.map((item) => {
    const dataArray = item.split(',');
    const result = {
      time: dataArray[0],
    };
    return result;
  }).reverse();
  return dates;
};

const getByDate = async (startDate, endDate, pageSize, startCCassCode, limitless) => {
  const rows = await northHolding.findAndCountAll(
    {
      where: {
        security_ccass_code: {
          [Op.gt]: startCCassCode || '30000',
        },
        trade_date: {
          [Op.and]: {
            // type = 1 表示这只股票的code找不到，大部分情况是已经被清仓了，所以去所有持仓数据，从2020-12-01开始
            [Op.gte]: startDate,
            [Op.lt]: endDate,
          },
        },
      },
      offset: 0,
      limit: limitless ? limitlessLength : parseInt(pageSize * pageByes, 10),
      order: [
        ['security_ccass_code', 'ASC'],
        ['trade_date', 'ASC'],
      ],
    },
  );
  return rows;
};

const getPreData = (r1, row) => {
  const tmp = row.rows.find((r) => r.security_ccass_code === r1.security_ccass_code);
  return {
    ccasscode: tmp ? tmp.security_ccass_code : '--',
    prev_holding_amt: tmp ? tmp.holding_amt : 0,
    prev_trade_date: tmp ? tmp.trade_date : 0,
    prev_holding_amt_rate: tmp ? tmp.holding_amt_rate : 0,
    offsetVal: r1.holding_amt - (tmp ? tmp.holding_amt : 0),
    changeRatio: tmp ? ((r1.holding_amt - tmp.holding_amt) / tmp.holding_amt)
      .toFixed(2) : 100,
  };
};

const getResult = (rows1, rows2, increase, decrease, performanceDuration) => {
  const tmpResult = rows1.rows
    .filter((r1) => {
      const tmp = rows2.rows.find((r) => r.security_ccass_code === r1.security_ccass_code);
      if (!tmp) {
        return false;
      }
      const result = tmp
        ? ((r1.holding_amt - tmp.holding_amt) / tmp.holding_amt).toFixed(2) : 1;
      if (result >= 0) {
        return result >= increase;
      }
      return result <= decrease;
    })
    .map((r1) => {
      const result = {
        ...r1.dataValues,
        daysago: performanceDuration,
        targetDays: getPreData(r1, rows2),
      };
      return result;
    });
  return tmpResult;
};

/**
 * calculate the increase/decrease ratio of the north finance holding.
 * and return the kline.
 * @param {*} finalResult the array object that hold the final result.
 * @param {*} rows2 previous data.
 * @param {*} mktOnlineDates market trade dates.
 * @param {*} startIndex start index
 * @param {*} pageSize page size.
 * @param {*} startCCassCode pagination ccass code.
 * @param {*} performanceDuration previous days of the rows.
 * @param {*} increase increase ratio
 * @param {*} decrease descrease ratio.
 * @returns klines.
 */
const fetchData = async (finalResult, rows2, mktOnlineDates, startIndex,
  pageSize, startCCassCode, performanceDuration, increase, decrease) => {
  const startDate1 = dayjs(mktOnlineDates[startIndex].time).format('YYYY-MM-DD');
  const endDate1 = (startIndex - 1 < 0 ? dayjs() : dayjs(mktOnlineDates[startIndex - 1].time)).format('YYYY-MM-DD');
  const rows1 = await getByDate(startDate1, endDate1, pageSize, startCCassCode, false);

  // fetch the data with specified page size recursively.
  const result = getResult(rows1, rows2, increase, decrease, performanceDuration);
  finalResult.push(...result.slice(0, pageSize - finalResult.length));
  if (finalResult.length < pageSize && rows1.rows.length > 0
    && rows1.rows.length <= Number(pageSize * pageByes)) {
    await fetchData(finalResult, rows2, mktOnlineDates, startIndex,
      pageSize,
      rows1.rows.slice(-1)[0].security_ccass_code,
      performanceDuration, increase, decrease);
  }
  // 当数据都准备好之后，去security表去拿股票code等信息
  const targetCCassCodes = finalResult.map((r) => r.security_ccass_code);
  const securities = await northSecurity.findAll({
    where: {
      security_ccass_code: {
        [Op.in]: targetCCassCodes,
      },
    },
  });
  const klineMap = async () => Promise.all(
    securities.map(async (s) => {
      const klines = await thriftClient.getStockline(
        `${s.security_code.startsWith('6') ? 'SH' : 'SZ'}.${s.security_code}`,
        dayjs(mktOnlineDates[performanceDuration + startIndex].time).format('YYYY-MM-DD'),
        endDate1,
      );
      const klineObj = {
        code: s.security_code,
        kline: klines,
      };
      return klineObj;
    }),
  );
  const klines = await klineMap();

  const realFinalResult = finalResult.map((r) => {
    const security = securities.find((s) => s.security_ccass_code === r.security_ccass_code);
    const rs = {
      security_code: security ? security.security_code : '--',
      ...r,
    };
    return rs;
  });
  finalResult.splice(0, finalResult.length);
  finalResult.push(...realFinalResult);

  return klines;
};

let mktOnlineDates = null;
router.get('/getStkPerformance', async (ctx) => {
  const params = ctx.request.query;
  // get the market k line, that get the trade date.
  mktOnlineDates = mktOnlineDates || await getMktOnlineDate();
  const pageSize = params.ps;
  const increase = Number(params.inc);
  const decrease = -Number(params.dec);
  const performanceDuration = Number(params.duration ? params.duration : 3);
  const startCCassCode = params.ccasscode;
  const finalResult = [];
  let startDate = params.startdate || dayjs().format('YYYY-MM-DD');
  let startIndex = 0;

  const dateArray = mktOnlineDates.map((d) => d.time);
  if (!mktOnlineDates.map((d) => d.time).includes(startDate)) {
    for (let i = 0; i < dateArray.length; i++) {
      if (dayjs(startDate).diff(dayjs(dateArray[i])) >= 0) {
        startDate = dateArray[i];
        startIndex = i;
        break;
      }
    }
  } else {
    startIndex = dateArray.indexOf(startDate);
  }
  console.log(`3------------->  target start date is index is ${startIndex}, ${startDate}.`);
  // get the start date of target previous date.
  const startDate2 = dayjs(mktOnlineDates[performanceDuration + startIndex].time).format('YYYY-MM-DD');
  const endDate2 = dayjs(mktOnlineDates[performanceDuration + startIndex - 1].time).format('YYYY-MM-DD');
  // get the previous date value.
  const rows2 = await getByDate(startDate2, endDate2, pageSize, startCCassCode, true);

  const klines = await fetchData(finalResult, rows2, mktOnlineDates, startIndex,
    pageSize, startCCassCode, performanceDuration, increase, decrease);

  ctx.body = {
    succcess: true,
    msg: `get data: in ${performanceDuration} days, increase >= ${increase * 100}% or decrease <= ${decrease * 100}%`,
    data: {
      finalResult,
      klines,
    },
  };
});

module.exports = router;
