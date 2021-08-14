const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const { northTransactionDetail } = require('../database/models/NorthTransactionDetail');
const { xueqiuClient } = require('../providers/xueqiu/xueqiuclient');

const start = async () => {
  const rows = await northTransactionDetail.findAll({
    attributes: [
      'trade_date',
      'security_mkt',
      [Sequelize.fn('sum', Sequelize.literal('(buy_trades - sell_trades)')), 'net_income'],
    ],
    group: [
      ['trade_date'], ['security_mkt'],
    ],
    having: Sequelize.literal('security_mkt LIKE "% Northbound"'),
  });
  const tmpResult = rows.map((r) => r.dataValues);
  const finalResult = new Map();
  tmpResult.forEach((result) => {
    const targetDate = dayjs(result.trade_date).format('YYYY-MM-DD');
    if (result.net_income) {
      if (finalResult.has(targetDate)) {
        const newVal = Number(finalResult.get(targetDate) + Number(result.net_income)).toFixed(2);
        finalResult.set(targetDate, newVal);
      } else {
        finalResult.set(targetDate, parseFloat(result.net_income));
      }
    }
  });
  const dateArray = Array.from(finalResult.keys());
  const endDate = dateArray.slice(-1)[0];
  const startDate = dateArray[0];
  const etf50Klines = await xueqiuClient('SH510050', startDate, endDate);
  const klineMap = new Map();
  etf50Klines.data.item.forEach((kline) => {
    const date = dayjs(kline[0]).format('YYYY-MM-DD');
    klineMap.set(date, {
      open: kline[2],
      close: kline[5],
      low: kline[4],
      high: kline[3],
    });
    return 0;
  });
  console.log(klineMap);
};

(async () => {
  start();
})();
