const router = require('koa-router')();
const { Op } = require('sequelize');

const dayjs = require('dayjs');
const { northHolding } = require('../database/models/NorthHolding');
const { northSecurity } = require('../database/models/NorthSecurity');

router.get('/:securityCode', async (ctx) => {
  const params = ctx.request.query;
  const code = ctx.params.securityCode;
  const startDate = dayjs(params.startDate);
  const endDate = dayjs(params.endDate);
  console.log(`start date: ${startDate}, end date: ${endDate}`);
  const security = await northSecurity.findOne(
    {
      where: {
        security_code: code,
      },
    },
  );
  console.log(security);
  const rows = await northHolding.findAll(
    {
      where: {
        security_ccass_code: security.security_ccass_code,
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
    },
  );
  ctx.body = {
    succcess: true,
    msg: 'get data success',
    data: {
      rows,
    },
  };
});

module.exports = router;
