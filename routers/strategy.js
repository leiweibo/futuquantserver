const router = require('koa-router')();

const { strategy1 } = require('../strategy/northbondstrategy');

router.get('/1', async (ctx) => {
  const params = ctx.request.query;
  const nDays = params.ndays || 1;
  const securityCode = params.code || 'SH510500';
  const initBalance = Number(params.init || 100000);
  const buyRatio = Number(params.buyRatio || 1);
  const sellRatio = Number(params.sellRatio || 1);
  const netBuy = Number(params.netBuy || 50) * 100;
  const netSell = -Number(params.netSell || 50) * 100;
  ctx.body = {
    succcess: true,
    msg: 'execute strategy success.',
    data: await strategy1(securityCode, nDays, initBalance, buyRatio, sellRatio, netBuy, netSell),
  };
});

module.exports = router;
