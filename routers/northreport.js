const router = require('koa-router')();
const { Op, Sequelize } = require('sequelize');

const dayjs = require('dayjs');
const { northHoldingReports } = require('../database/models/NorthHoldingReport');
const { northHolding } = require('../database/models/NorthHolding');
const { northSecurity } = require('../database/models/NorthSecurity');

router.get('/:securityCode', async (ctx) => {
  const params = ctx.request.query;
  const code = ctx.params.securityCode;
  const page = params.p;
  const pageSize = params.ps;
  const startDate = dayjs(params.startDate);
  const endDate = dayjs(params.endDate);
  console.log(`start date: ${startDate}, end date: ${endDate}, page: ${page}, pageSize: ${pageSize}`);
  const { count, rows } = await northHoldingReports.findAndCountAll(
    {
      where: {
        security_code: code,
        trade_date: {
          [Op.and]: {
            [Op.gte]: params.startDate,
            [Op.lte]: endDate.add(1, 'day').format('YYYY-MM-DD'),
          },
        },
      },
      order: [
        ['trade_date', 'ASC'],
      ],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize, 10),
    },
  );
  ctx.body = {
    succcess: true,
    msg: 'get data success',
    data: {
      totalPages: Math.ceil(count / pageSize),
      curPage: page,
      rows,
      total: count,
    },
  };
});

const getHoldingGroupByMonth = async (month, fromScratch) => {
  const startDate = fromScratch ? dayjs().set('month', 10).set('year', 2020).set('date', 1) : dayjs().set('month', month - 1).set('date', 1);
  const endDate = dayjs().set('month', month).set('date', 1);
  const rows = await northHolding.findAll({
    attributes: [
      'security_ccass_code',
      [Sequelize.fn('sum', Sequelize.col('holding_amt')), 'total_holding_amount'],
    ],
    where: {
      trade_date: {
        [Op.and]: {
          [Op.gte]: startDate.format('YYYY-MM-DD'),
          [Op.lt]: endDate.format('YYYY-MM-DD'),
        },
      },
    },
    group: 'security_ccass_code',
  });
  return rows;
};

router.get('/monthly/diff', async (ctx) => {
  const params = ctx.request.query;
  const month = params.m;
  const curMonthData = await getHoldingGroupByMonth(month);
  const previousData = await getHoldingGroupByMonth(month - 1);

  const diffResult = curMonthData.filter((v) => {
    const exists = previousData.find((e) => e.security_ccass_code === v.security_ccass_code);
    return !exists;
  });
  const targetList = diffResult.map((r) => r.security_ccass_code);
  const northSecurityList = await northSecurity.findAll({
    where: {
      security_ccass_code: {
        [Op.in]: targetList,
      },
    },
  });

  const finalResult = diffResult.map((r) => {
    const tmp = northSecurityList.find((e) => e.security_ccass_code === r.security_ccass_code);
    return {
      totalHoldAmt: r.total_holding_amount,
      securityCCassCode: r.security_ccass_code,
      securityCode: tmp.security_code,
      securityName: tmp.security_name,
    };
  });

  ctx.body = {
    succcess: true,
    msg: 'get data success',
    result: finalResult,
    count: finalResult.length,
  };
});

module.exports = router;
