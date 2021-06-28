// 生成指定股票
const { Op } = require('sequelize');
const { northHolding } = require('../database/models/NorthHolding');
const { northSecurity } = require('../database/models/NorthSecurity');
const { northHoldingReports } = require('../database/models/NorthHoldingReport');

const start = async (code) => {
  const security = await northSecurity.findOne(
    {
      where: {
        security_code: code,
      },
    },
  );
  if (!security) {
    console.log(`the targe ${code} not in the north security pool.`);
    return;
  }
  const report = await northHoldingReports.findOne(
    {
      where: {
        security_ccass_code: security.security_ccass_code,
        type: 0,
      },
      order: [
        ['trade_date', 'DESC'],
      ],
    },
  );

  const allTargetData = await northHolding.findAll(
    {
      where: {
        security_ccass_code: {
          [Op.eq]: security.security_ccass_code,
        },
        trade_date: {
          [Op.gte]: report ? report.trade_date : 0,
        },
      },
      order: [
        ['trade_date', 'ASC'],
      ],
    },
  );
  let previousAmt = -1;
  const finalResult = allTargetData.filter((data) => data.trade_date
    > (report ? report.trade_date : 0)).map((data) => {
    const result = {
      trade_date: data.trade_date,
      security_code: code,
      security_ccass_code: data.security_ccass_code,
      security_name: data.security_name,
      security_mkt: data.security_mkt,
      holding_amt: data.holding_amt,
      holding_amt_rate: data.holding_amt_rate,
      offset: previousAmt === -1 ? 0 : data.holding_amt - previousAmt,
      type: 0,
    };
    previousAmt = data.holding_amt;
    return result;
  });
  if (finalResult.length === 0) {
    console.log('No data inserted.');
  } else {
    console.log(`insert into values ${finalResult.length}`);
    northHoldingReports.bulkCreate(finalResult);
  }
};

(async () => {
  const targetStocks = ['601878', '000002', '601318', '000651', '000725', '003030', '600196', '600030', '600315', '600115', '600660'];
  targetStocks.forEach((val) => {
    start(val);
  });
})();
