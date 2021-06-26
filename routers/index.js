const router = require('koa-router')();

const { apiPrefix } = require('../config/index');

const categoryService = require('./catetory');
const securityService = require('./security');
const northReportService = require('./northreport');

router.prefix(apiPrefix);

router.use('/category', categoryService.routes());
router.use('/valuation', securityService.routes());
router.use('/northreport', northReportService.routes());

module.exports = router;
