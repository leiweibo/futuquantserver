const dayjs = require('dayjs');
const { Op, Sequelize } = require('sequelize');
const { northHolding } = require('../database/models/NorthHolding');

const getHoldingGroupByMonth = async (date, fromScratch) => {
  const startDate = fromScratch ? dayjs().set('month', 10).set('year', 2020).set('date', 1) : dayjs().set('month', date.get('month')).set('year', date.get('year')).set('date', 1);
  const endDate = dayjs().set('month', date.get('month') + 1).set('date', 1);
  const rows = await northHolding.findAll({
    attributes: [
      'security_ccass_code',
      [Sequelize.fn('sum', Sequelize.col('holding_amt')), 'total_holding_amount'],
      'security_mkt',
    ],
    where: {
      trade_date: {
        [Op.and]: {
          [Op.gte]: startDate.format('YYYY-MM-DD'),
          [Op.lt]: endDate.format('YYYY-MM-DD'),
        },
      },
    },
    group: ['security_ccass_code', 'security_mkt'],
  });
  return rows;
};

module.exports = { getHoldingGroupByMonth };
