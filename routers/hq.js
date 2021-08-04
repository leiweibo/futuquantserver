const router = require('koa-router')();
const axios = require('axios');
const dayjs = require('dayjs');

router.get('/kline', async (ctx) => {
  const params = ctx.request.query;
  const startDate = dayjs(params.startdate).format('YYYYMMDD');
  const endDate = dayjs(params.enddate).format('YYYYMMDD');
  const security = params.code;
  const URL = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${security}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&end=${endDate}&lmt=1000000&beg=${startDate}`;
  const klineRes = await axios.get(URL);
  const { data } = klineRes;
  const rows = data.data.klines.map((item) => {
    const dataArray = item.split(',');
    const result = {
      openPrice: Number(dataArray[1]),
      closePrice: Number(dataArray[2]),
      highPrice: Number(dataArray[3]),
      lowPrice: Number(dataArray[4]),
      volume: Number(dataArray[5]),
      turnover: Number(dataArray[6]), // 成交额
      changeRate: Number(dataArray[8]),
      timestamp: dayjs(dataArray[0]).unix(),
      time: dataArray[0],
    };
    return result;
  });
  ctx.body = {
    succcess: true,
    msg: 'get data success',
    data: {
      rows,
    },
  };
});

module.exports = router;
