const router = require('koa-router')();
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { northHoldingReports } = require('../database/models/NorthHoldingReport');
const { northSecurity } = require('../database/models/NorthSecurity');
const { getHoldingGroupByMonth } = require('../helpers/northreporthelper');

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

const getDiff = async (array1, array2) => {
  const diffResult = array1.filter((v) => {
    const exists = array2.find((e) => e.security_ccass_code === v.security_ccass_code);
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
      securityCode: tmp == null ? '' : tmp.security_code,
      securityName: r.security_name,
      securityMkt: r.security_mkt,
    };
  });

  return finalResult;
};

router.get('/monthly/diff', async (ctx) => {
  const params = ctx.request.query;
  const date = dayjs(params.d);
  const curMonthData = await getHoldingGroupByMonth(date);
  const previousData = await getHoldingGroupByMonth(date.subtract(1, 'month'));

  const increaseResult = await getDiff(curMonthData, previousData);
  const decreaseResult = await getDiff(previousData, curMonthData);
  ctx.body = {
    succcess: true,
    msg: 'get data success',
    increaseResult,
    decreaseResult,
    count: increaseResult.length + decreaseResult.length,
  };
});

module.exports = router;
