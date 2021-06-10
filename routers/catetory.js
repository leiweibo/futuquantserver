const router = require('koa-router')();

router.get('/', async (ctx) => {
  ctx.body = 'I am the category api.';
});

router.post('/', async (ctx) => {
  ctx.body = ctx.request.body;
});

module.exports = router;
