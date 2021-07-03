// 生成指定股票
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { getHoldingGroupByMonth } = require('../helpers/northreporthelper');
const { northHoldingReports } = require('../database/models/NorthHoldingReport');
const { northHolding } = require('../database/models/NorthHolding');
const { northSecurity } = require('../database/models/NorthSecurity');

const start = async () => {
  const startDate = dayjs().set('year', 2020).set('month', 12);
  const endDate = dayjs().subtract(1, 'month');

  const diffMonth = endDate.diff(startDate, 'month');
  const targetDateList = [];
  for (let i = 0; i <= diffMonth; i++) {
    const c = dayjs(endDate).subtract(i, 'month');
    const p = dayjs(endDate).subtract(i + 1, 'month');
    targetDateList.push({ c, p });
  }

  targetDateList.forEach(async (t) => {
    const curMonthData = await getHoldingGroupByMonth(t.c);
    const preMonthData = await getHoldingGroupByMonth(t.p);

    const diffResult = curMonthData.filter((v) => {
      const exists = preMonthData.find((e) => e.security_ccass_code === v.security_ccass_code);
      return !exists;
    });
    const targetList = diffResult.map((r) => {
      const tmpRes = {
        ccass_code: r.security_ccass_code,
        trade_date: t.c,
      };
      return tmpRes;
    });
    // console.log(`${t.c.format('YYYY-MM')} new add share is: ${targetList.length}`);

    targetList.forEach(async (d) => {
      const report = await northHoldingReports.findOne(
        {
          where: {
            security_ccass_code: d.ccass_code,
            type: 1,
          },
          order: [
            ['trade_date', 'DESC'],
          ],
        },
      );

      let tmpData = dayjs(t.c);
      let startTrade = report ? dayjs(report.trade_date) : tmpData.set('date', 1);
      let endTrade = report ? dayjs(report.trade_date) : tmpData.add(1, 'month').set('date', 1);
      const monthStartData = await northHolding.findOne(
        {
          where: {
            security_ccass_code: {
              [Op.eq]: d.ccass_code,
            },
            trade_date: {
              [Op.gte]: startTrade.format('YYYY-MM-DD'),
              [Op.lt]: endTrade.format('YYYY-MM-DD'),
            },
          },
          order: [
            ['trade_date', 'ASC'],
          ],
        },
      );

      tmpData = dayjs(t.c);
      startTrade = report ? dayjs(report.trade_date) : tmpData.set('date', 1);
      endTrade = report ? dayjs(report.trade_date) : tmpData.add(1, 'month').set('date', 1);
      console.log(`=============> ${startTrade}, ${endTrade}`);
      const monthEndData = await northHolding.findOne(
        {
          where: {
            security_ccass_code: {
              [Op.eq]: d.ccass_code,
            },
            trade_date: {
              [Op.gte]: startTrade.format('YYYY-MM-DD'),
              [Op.lt]: endTrade.format('YYYY-MM-DD'),
            },
          },
          order: [
            ['trade_date', 'DESC'],
          ],
        },
      );

      const security = await northSecurity.findOne(
        {
          where: {
            security_ccass_code: d.ccass_code,
          },
        },
      );
      if (!monthStartData) {
        console.log(`${d.ccass_code}: no month start data, no data insert.`);
        return;
      }

      if (!monthEndData) {
        console.log(`${d.ccass_code}: no month end data, no data insert.`);
        return;
      }
      northHoldingReports.create(
        {
          trade_date: monthEndData.trade_date,
          security_code: security.security_code,
          security_ccass_code: security.security_ccass_code,
          security_name: monthEndData.security_name,
          security_mkt: monthEndData.security_mkt,
          holding_amt: monthEndData.holding_amt,
          holding_amt_rate: monthEndData.holding_amt_rate,
          offset: monthEndData.holding_amt - monthStartData.holding_amt,
          type: 1,
        },
      );
    });
  });
};

(async () => {
  start();
})();
