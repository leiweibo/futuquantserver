const router = require('koa-router')();
const { Op } = require('sequelize');

const dayjs = require('dayjs');
const { northHoldingReports } = require('../database/models/NorthHoldingReport');

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

module.exports = router;
