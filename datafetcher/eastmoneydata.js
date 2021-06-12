const axios = require('axios');
const dayjs = require('dayjs');
const winston = require('winston');
const { securityValuation, normalizeArray } = require('../database/models/SecurityValuation');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

// stkValuation('601878', 1, 500);
// https://segmentfault.com/a/1190000022950559

const blukInsertSecurity = async (dataArray) => {
  try {
    if (dataArray && dataArray.length > 0) {
      await securityValuation.bulkCreate(dataArray);
      logger.info('bulk insert finished');
    }
  } catch (error) {
    logger.error(error.stack);
  }
};

const generateUrl = function (securityCode, page, pageSize) {
  return `http://dcfm.eastmoney.com/em_mutisvcexpandinterface/api/js/get?st=TRADEDATE&sr=-1&ps=${pageSize}&p=${page}&type=GZFX_GGZB&token=894050c76af8597a853f5b408b759f5d&js={"data":(x),"pages":(tp)}&filter=(SECURITYCODE=^${securityCode}^)`;
};

const fetchMktvalue = async (securityCode) => {
  try {
    const latestRecord = await securityValuation.findOne(
      {
        where: { security_code: securityCode },
        order: [
          ['trade_date', 'DESC'],
        ],
      },
    );
    let pageSize = 0;
    let page = 1;
    let loopFetch = true;

    if (latestRecord) {
      logger.info(`the lastRecord is ${latestRecord.trade_date}`);
      const lastRecordDate = dayjs(latestRecord.trade_date).format('YYYY-MM-DD');
      pageSize = dayjs().diff(lastRecordDate, 'day');
      logger.info(`the page size is ${pageSize}`);
      loopFetch = false;
    } else {
      pageSize = 1000;
    }

    if (pageSize < 1) {
      logger.info('No fetch needed.');
      process.exit(1);
    }

    const resp = await axios.get(generateUrl(securityCode, page, pageSize));
    const { headers } = resp;
    const contentType = headers['content-type'];
    if (contentType && contentType.includes('text/plain')) {
      const result = JSON.parse(JSON.stringify(resp.data));
      const { pages, data } = result;
      logger.info(`the raw result's length is ${data.length}`);
      const finalResult = normalizeArray(data,
        latestRecord == null ? dayjs('1990-01-01') : dayjs(latestRecord.trade_date));
      logger.info(`the final result's length is ${finalResult.length} and loopFetch: ${loopFetch}, the pages:${pages}`);
      blukInsertSecurity(finalResult);
      let i = 0;
      if (loopFetch) {
        for (i = pages; i >= 2; i--) {
          page = i;
          logger.info('start to loop fetch.');
          axios.get(generateUrl(securityCode, page, pageSize))
            .then((newResp) => {
              logger.info('get response from the request');
              const tmpHeaders = newResp.headers;
              const tmpContentType = tmpHeaders['content-type'];
              if (tmpContentType && contentType.includes('text/plain')) {
                const tmpResult = JSON.parse(JSON.stringify(newResp.data));
                logger.info(`${tmpResult.data[0].TRADEDATE}`);
                const tmpFinalResult = tmpResult.data
                  .map((obj) => {
                    const rObj = {};
                    rObj.security_code = obj.SECURITYCODE;
                    rObj.security_mkt = obj.MKT;
                    rObj.security_name = obj.SName;
                    rObj.trade_date = obj.TRADEDATE;
                    rObj.close_price = obj.NEW;
                    rObj.change_rate = obj.CHG;
                    rObj.mkt_value = obj.ZSZ;
                    rObj.traded_mkt_value = obj.AGSZBHXS;
                    rObj.total_equity = obj.ZGB;
                    rObj.total_traded_equity = obj.LTAG;
                    rObj.pe_ttm = obj.PE9;
                    rObj.pe_static = obj.PE7;
                    rObj.pb = obj.PB8;
                    rObj.peg = obj.PEG1;
                    rObj.pcf = obj.PCFJYXJL9;
                    rObj.pts = obj.PS7;
                    return rObj;
                  });
                blukInsertSecurity(tmpFinalResult);
              }
            });
        }
      }
    }
  } catch (error) {
    logger.error(error.stack);
  }
};

const targetStocks = ['601878', '000002', '601318', '000651', '000725', '003030', '600196', '600030', '600315', '600115', '600660'];
targetStocks.forEach((val) => {
  fetchMktvalue(val);
});
