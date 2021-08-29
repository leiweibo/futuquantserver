/**
 * 从 http://data.eastmoney.com/hsgtcg/gzcglist.html这个页面获取数据，用来分析
 * 比如：某一日增幅最大的，未来5天的收益率怎么样。
 */
const axios = require('axios');
const dayjs = require('dayjs');
const winston = require('winston');
const { northHolding, normalizeArray } = require('../database/models/NorthHoldingEastmoney');

const generateUrl = function (ps) {
  return `https://dcfm.eastmoney.com/em_mutisvcexpandinterface/api/js/get?st=HdDate&sr=-1&ps=${ps}&p=1&type=HSGT20_SC_LS_MX&token=70f12f2f4f091e459a279469fe49eca5&js={"data":(x),"pages":(tp)}&filter=(Market='005')`;
};

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

const blukInsertSecurity = async (dataArray) => {
  try {
    if (dataArray && dataArray.length > 0) {
      await northHolding.bulkCreate(dataArray);
      logger.info('bulk insert finished');
    }
  } catch (error) {
    logger.error(error.stack);
  }
};

const fetchLatestRecord = async () => {
  const latestRecord = await northHolding.findOne(
    {
      order: [
        ['trade_date', 'DESC'],
      ],
    },
  );
  return latestRecord;
};

const start = async () => {
  const lastRecord = await fetchLatestRecord();
  let pageSize = 0;
  if (lastRecord && lastRecord.trade_date) {
    pageSize = dayjs().diff(lastRecord.trade_date, 'day');
  } else {
    pageSize = 300;
  }

  if (pageSize === 0) {
    console.log('no data need to fetch.');
    return;
  }

  const url = generateUrl(pageSize);
  const resp = await axios.get(url);
  const { headers } = resp;
  const contentType = headers['content-type'];
  if (contentType && contentType.includes('text/plain')) {
    const result = JSON.parse(JSON.stringify(resp.data));
    const { data } = result;
    const processedResult = normalizeArray(data);
    const finalResult = processedResult.filter(
      (r) => (lastRecord ? dayjs(r.trade_date).diff(lastRecord.trade_date) > 0 : true),
    );
    console.log(`the final insert record is ${finalResult}`);
    await blukInsertSecurity(finalResult);
  }
};

(async () => {
  await start();
})();
