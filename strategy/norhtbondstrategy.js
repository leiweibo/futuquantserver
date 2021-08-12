const { Sequelize } = require('sequelize');
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
  tmpResult.forEach((result) => {
    const targetDate = result.trade_date;
    if (finalResult.has(targetDate)) {
      finalResult.set(targetDate, finalResult.get(targetDate) + result.net_income);
    } else {
      finalResult.set(targetDate, result.targetDate);
    }
  });
  console.log(finalResult);
};

(async () => {
  start();
})();
