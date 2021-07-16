const router = require('koa-router')();
const axios = require('axios');
const dayjs = require('dayjs');

// http://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=50&pageNumber=1&reportName=RPT_SHAREBONUS_DET&columns=ALL&js={"data":(x),"pages":(tp)}&source=WEB&client=WEB&filter=(SECUCODE="002532.SZ")
// 获取分红数据

router.get('/:code', async (ctx) => {
  const securityCode = ctx.params.code;

  const dividedBonusUrl = `http://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=50&pageNumber=1&reportName=RPT_SHAREBONUS_DET&columns=ALL&source=WEB&client=WEB&filter=(SECUCODE="${securityCode}")`;
  const dividedBonusRes = await axios.get(dividedBonusUrl);
  const dividedBonus = dividedBonusRes.data.result.data;
  const resultMap = new Map();
  dividedBonus.map((bonus) => {
    const key = dayjs(bonus.REPORT_DATE).get('year');
    if (resultMap.has(key)) {
      resultMap.set(key, resultMap.get(key) + bonus.PRETAX_BONUS_RMB);
    } else {
      resultMap.set(key, bonus.PRETAX_BONUS_RMB);
    }
    return 0;
  });
  ctx.body = {
    succcess: true,
    msg: 'get data success',
    data: {
      dates: Array.from(resultMap.keys()),
      bonus: Array.from(resultMap.values()),
    },
  };
});

module.exports = router;
