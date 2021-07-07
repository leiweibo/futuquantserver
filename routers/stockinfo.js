const router = require('koa-router')();
const axios = require('axios');
const dayjs = require('dayjs');
const puppeteer = require('puppeteer');

// http://f10.eastmoney.com/NewFinanceAnalysis/zcfzbDateAjaxNew?companyType=4&reportDateType=1&code=SZ000002
// 通过上面的这个地址，来获取年报的时间，然后传个下面的这个url里面的dates字段。
// 其中reportDateType=1表示年报日期，reportDateType=0表示所有类型
// companyType 由网页端获取。

// http://f10.eastmoney.com/NewFinanceAnalysis/zcfzbAjaxNew?companyType=4&reportDateType=1&reportType=1&dates=2020-12-31,2019-12-31,2018-12-31,2017-12-31,2016-12-31&code=SZ002532
// 获取所有的date对应的报告。
// 目前我们需要获取最新一期的报告+过去的年报
// reportDateType: 0,表示按报告期
// reportDateType: 1,表示按年度

router.get('/important', async (ctx) => {
  const params = ctx.request.query;
  const securityCode = params.code;

  // run pupperteer to get the company type.
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://f10.eastmoney.com/f10_v2/FinanceAnalysis.aspx?code=${securityCode}`, { waitUntil: 'load', timeout: 0 });
  const companyType = await page.evaluate(() => document.querySelector('#hidctype').value);
  browser.close();
  const datesUrls = `http://f10.eastmoney.com/NewFinanceAnalysis/zcfzbDateAjaxNew?companyType=${companyType}&reportDateType=0&code=${securityCode}`;
  const dateResp = await axios.get(datesUrls);
  const { data } = dateResp;
  const dateList = data.data.filter((d, index) => {
    const filterRes = index === 0 || d.REPORT_DATE.indexOf('-12-31') >= 0;
    return filterRes;
  }).map((d1) => dayjs(d1.REPORT_DATE).format('YYYY-MM-DD'));

  // 获取资产负债率 = 总负债/总资产
  // 质押比例 直接从下面url获取：
  // https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=TRADE_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_CSDC_LIST&columns=ALL&quoteColumns=&source=WEB&client=WEB&filter=(SECURITY_CODE=%22601318%22)
  // 商誉/净资产比 = 商誉/归属于母公司股东权益总计
  const assetsDebtUrl = `http://f10.eastmoney.com/NewFinanceAnalysis/zcfzbAjaxNew?companyType=${companyType}&reportDateType=0&reportType=1&dates=${dateList.join()}&code=${securityCode}`;
  console.log(`the assetsDebtUrl is ${assetsDebtUrl}`);
  const assetsDebtResp = await axios.get(assetsDebtUrl);
  const assetDebtRatios = assetsDebtResp.data.data.map((assetDebtData) => {
    const result = {
      totalAsset: assetDebtData.TOTAL_ASSETS, // 总资产
      totalLiabilities: assetDebtData.TOTAL_LIABILITIES, // 总负债,
      debtRatio: (Number(assetDebtData.TOTAL_LIABILITIES) / Number(assetDebtData.TOTAL_ASSETS))
        .toFixed(4),
    };
    return result;
  });
  ctx.body = {
    succcess: true,
    msg: 'get data success',
    data: assetDebtRatios,
  };
});

module.exports = router;
