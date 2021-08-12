const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const { northTransactionDetail } = require('../database/models/NorthTransactionDetail');

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
  console.log(tmpResult[0]);
  console.log(tmpResult[1]);
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
  console.log(finalResult);
};

(async () => {
  start();
})();
