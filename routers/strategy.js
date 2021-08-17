const router = require('koa-router')();

const { strategy1 } = require('../strategy/northbondstrategy');

router.get('/1', async (ctx) => {
  ctx.body = {
    succcess: true,
    msg: 'execute strategy success.',
    data: await strategy1(),
  };
});

module.exports = router;
