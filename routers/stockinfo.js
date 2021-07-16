const router = require('koa-router')();
const axios = require('axios');
const dayjs = require('dayjs');
const puppeteer = require('puppeteer');
const { puppeteerConfig } = require('../helpers/puppeteerhelper');

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
  const browser = await puppeteer.launch(puppeteerConfig);
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
  const assetsDebtUrl = `http://f10.eastmoney.com/NewFinanceAnalysis/zcfzbAjaxNew?companyType=${companyType}&reportDateType=0&reportType=1&dates=${dateList.join()}&code=${securityCode}`;
  // 这个接口一次请求最多返回5条，但对于我们的情况，5条也够了。
  const assetsDebtResp = await axios.get(assetsDebtUrl);
  const assetDebtRatios = assetsDebtResp.data.data.map((assetDebtData) => {
    // 商誉
    const goodWill = assetDebtData.GOODWILL;
    // 净资产，即归属于母公司股东权益总计
    const netAssset = assetDebtData.TOTAL_PARENT_EQUITY;
    // 应付债券
    const boundPayable = assetDebtData.BOND_PAYABLE;
    // 长期借款
    const shortLoan = assetDebtData.SHORT_LOAN;
    // 短期借款
    const longLoan = assetDebtData.LONG_LOAN;
    // 货币现金
    const cash = assetDebtData.MONETARYFUNDS;
    const result = {
      // 总资产
      totalAsset: assetDebtData.TOTAL_ASSETS,
      // 总负债,
      totalLiabilities: assetDebtData.TOTAL_LIABILITIES,
      // 资产负债率
      debtRatio: (Number(assetDebtData.TOTAL_LIABILITIES) / Number(assetDebtData.TOTAL_ASSETS))
        .toFixed(4),
      // 商誉/净资产比 = 商誉/归属于母公司股东权益总计
      goodWillRatio: (Number(goodWill) / Number(netAssset)).toFixed(4),
      reportDate: dayjs(assetDebtData.REPORT_DATE).format('YYYY-MM-DD'),
      boundPayable,
      shortLoan,
      longLoan,
      cash,
    };
    return result;
  });

  // 主要指标
  const keyIndexUrl = `http://f10.eastmoney.com/NewFinanceAnalysis/ZYZBAjaxNew?type=1&code=${securityCode}`;
  const keyIndexResp = await axios.get(keyIndexUrl);
  const keyIndexData = keyIndexResp.data.data.map((grossProfit) => {
    const result = {
      reportDate: dayjs(grossProfit.REPORT_DATE).format('YYYY-MM-DD'),
      // 毛利率
      grossProfit: grossProfit.XSMLL,
      // ROE
      roe: grossProfit.ROEJQ,
      // 净利润
      netProfit: grossProfit.PARENTNETPROFIT,
      // 净利润增长率
      netProfiltRatio: Number(grossProfit.PARENTNETPROFITTZ.toFixed(2)),
    };
    return result;
  });

  // 利润表数据
  const profitUrl = `http://f10.eastmoney.com/NewFinanceAnalysis/lrbAjaxNew?companyType=${companyType}&reportDateType=0&reportType=1&dates=${dateList}&code=${securityCode}`;
  const profitResp = await axios.get(profitUrl);
  const finalComposedData = profitResp.data.data.map((profitData, index) => {
    const finalResult = {
      ...assetDebtRatios[index],
      netProfit: profitData.PARENT_NETPROFIT,
    };
    return finalResult;
  });

  // 经营现金流
  const operationCashFlowUrl = `http://f10.eastmoney.com/NewFinanceAnalysis/xjllbAjaxNew?companyType=${companyType}&reportDateType=1&reportType=1&dates=${dateList}&code=${securityCode}`;
  const operationCashFlowResp = await axios.get(operationCashFlowUrl);
  const operationCashFlowData = operationCashFlowResp.data.data.map((cashflowData) => {
    const cashflowResult = {
      reportDate: cashflowData.REPORT_DATE,
      netCashflow: cashflowData.NETCASH_OPERATE,
    };
    return cashflowResult;
  });

  let convertedSecurityCode = '';
  if (securityCode.startsWith('SH')) {
    convertedSecurityCode = securityCode.replace('SH', '1.');
  } else {
    convertedSecurityCode = securityCode.replace('SZ', '0.');
  }
  // 获取总市值
  const totalMktValUrl = `http://push2.eastmoney.com/api/qt/stock/get?fields=f116,f58&secid=${convertedSecurityCode}`;
  const totalMktValueResp = await axios.get(totalMktValUrl);
  const totalMktValue = totalMktValueResp.data.data.f116;
  const securityName = totalMktValueResp.data.data.f58;
  // 质押比例 直接从下面url获取：
  const pledgeUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=TRADE_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPT_CSDC_LIST&columns=ALL&quoteColumns=&source=WEB&client=WEB&filter=(SECURITY_CODE="${securityCode.substring(2)}")`;
  const pledgeResp = await axios.get(pledgeUrl);
  const pledgeRespJson = JSON.parse(JSON.stringify(pledgeResp.data));
  const pledgeRatio = pledgeRespJson.result.data[0].PLEDGE_RATIO;

  ctx.body = {
    succcess: true,
    msg: 'get data success',
    data: {
      securityName,
      securityCode,
      totalMktValue,
      finalComposedData,
      keyIndexData,
      pledgeRatio,
      operationCashFlowData,
    },
  };
});

module.exports = router;
