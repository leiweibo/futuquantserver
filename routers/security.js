const router = require('koa-router')();
const { Op } = require('sequelize');

const dayjs = require('dayjs');
const { securityValuation } = require('../database/models/SecurityValuation');

router.get('/:securityCode', async (ctx) => {
  const params = ctx.request.query;
  const code = ctx.params.securityCode;
  const page = params.p;
  const pageSize = params.ps;
  const startDate = dayjs(params.startDate);
  const endDate = dayjs(params.endDate);
  console.log(`start date: ${startDate}, end date: ${endDate}, page: ${page}, pageSize: ${pageSize}`);
  const { count, rows } = await securityValuation.findAndCountAll(
    {
      where: {
        security_code: code,
        trade_date: {
          [Op.and]: {
            [Op.gt]: params.startDate,
            [Op.lt]: params.endDate,
          },
        },
      },
      order: [
        ['trade_date', 'DESC'],
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
    },
  };
});

module.exports = router;
