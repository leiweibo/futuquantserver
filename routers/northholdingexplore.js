const router = require('koa-router')();
const axios = require('axios');
const dayjs = require('dayjs');

const { Op } = require('sequelize');

const { northHolding } = require('../database/models/NorthHolding');
// const { northSecurity } = require('../database/models/NorthSecurity');

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

const getByDate = async (startDate, endDate, page, pageSize) => {
  const rows = await northHolding.findAndCountAll(
    {
      where: {
        trade_date: {
          [Op.and]: {
            // type = 1 表示这只股票的code找不到，大部分情况是已经被清仓了，所以去所有持仓数据，从2020-12-01开始
            [Op.gt]: startDate,
            [Op.lte]: endDate,
          },
        },
      },
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize, 10),
      order: [
        ['security_ccass_code', 'ASC'],
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

router.get('/getStkPerformance', async (ctx) => {
  const params = ctx.request.query;
  // const performanceCode = params.code;
  const mktOnlineDates = await getMktOnlineDate();
  const page = params.p;
  const pageSize = params.ps;
  const increase = Number(params.inc);
  const decrease = -Number(params.dec);
  const performanceDuration = Number(params.duration ? params.duration : 3);

  const startDate1 = dayjs(mktOnlineDates[1].time).format('YYYY-MM-DD');
  const endDate1 = dayjs(mktOnlineDates[0].time).format('YYYY-MM-DD');
  const rows1 = await getByDate(startDate1, endDate1, page, pageSize);

  const startDate2 = dayjs(mktOnlineDates[1 + performanceDuration].time).format('YYYY-MM-DD');
  const endDate2 = dayjs(mktOnlineDates[performanceDuration].time).format('YYYY-MM-DD');
  const rows2 = await getByDate(startDate2, endDate2, page, pageSize);

  // const startDate3 = dayjs(mktOnlineDates[1 + 5].time).format('YYYY-MM-DD');
  // const endDate3 = dayjs(mktOnlineDates[5].time).format('YYYY-MM-DD');
  // const rows3 = await getByDate(startDate3, endDate3, page, pageSize);

  // const startDate4 = dayjs(mktOnlineDates[1 + 15].time).format('YYYY-MM-DD');
  // const endDate4 = dayjs(mktOnlineDates[15].time).format('YYYY-MM-DD');
  // const rows4 = await getByDate(startDate4, endDate4, page, pageSize);

  const finalResult = rows1.rows
    .filter((r1) => {
      const tmp = rows2.rows.find((r) => r.security_ccass_code === r1.security_ccass_code);
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

  ctx.body = {
    succcess: true,
    msg: `get data: in ${performanceDuration} days, increase >= ${increase * 100}% or decrease <= ${decrease * 100}%`,
    data: {
      finalResult,
      count: finalResult.length,
    },
  };
});

module.exports = router;
