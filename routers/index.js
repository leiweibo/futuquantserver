const router = require('koa-router')();

const { apiPrefix } = require('../config/index');

const categoryService = require('./catetory');
const securityService = require('./security');
const northReportService = require('./northreport');
const northHoldingService = require('./northholding');
const stockInforService = require('./stockinfo');

router.prefix(apiPrefix);

router.use('/category', categoryService.routes());
router.use('/valuation', securityService.routes());
router.use('/northreport', northReportService.routes());
router.use('/northholding', northHoldingService.routes());
router.use('/stockinfo', stockInforService.routes());

module.exports = router;
