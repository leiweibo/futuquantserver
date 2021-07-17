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
  const type = params.type ? params.type : '0';
  console.log(`start date: ${startDate}, end date: ${endDate}`);
  let security = {};
  if (type === '1') {
    security.security_ccass_code = code;
  } else {
    security = await northSecurity.findOne(
      {
        where: {
          security_code: code,
        },
      },
    );
  }

  const rows = await northHolding.findAll(
    {
      where: {
        security_ccass_code: security.security_ccass_code,
        trade_date: {
          [Op.and]: {
            // type = 1 表示这只股票的code找不到，大部分情况是已经被清仓了，所以去所有持仓数据，从2020-12-01开始
            [Op.gte]: type === '1' ? '2020-12-01' : params.startDate,
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
