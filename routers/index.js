const router = require('koa-router')();

const { apiPrefix } = require('../config/index');

const categoryService = require('./catetory');

router.prefix(apiPrefix);

router.use('/category', categoryService.routes());

module.exports = router;
