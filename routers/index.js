const router = require('koa-router')();

const { apiPrefix } = require('../config/index');

const categoryService = require('./catetory');
const securityService = require('./security');

router.prefix(apiPrefix);

router.use('/category', categoryService.routes());
router.use('/valuation', securityService.routes());

module.exports = router;
