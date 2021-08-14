const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const { northTransactionDetail } = require('../database/models/NorthTransactionDetail');
const { thriftClient } = require('../providers/baostock/NodeClient');

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
  // http://baostock.com/baostock/index.php/%E6%8C%87%E6%95%B0%E6%95%B0%E6%8D%AE
  const klines = await thriftClient.getStockline('SH.510800', startDate, endDate);
  console.log(klines);
};

(async () => {
  start();
})();
