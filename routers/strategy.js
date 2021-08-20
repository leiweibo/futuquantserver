const router = require('koa-router')();

const { strategy1 } = require('../strategy/northbondstrategy');

router.get('/1', async (ctx) => {
  const params = ctx.request.query;
  const securityCode = params.code || 'SH510500';
  const initBalance = Number(params.init || 100000);
  const buyRatio = Number(params.buyRatio || 1);
  const sellRatio = Number(params.sellRatio || 1);
  ctx.body = {
    succcess: true,
    msg: 'execute strategy success.',
    data: await strategy1(securityCode, initBalance, buyRatio, sellRatio),
  };
});

module.exports = router;
