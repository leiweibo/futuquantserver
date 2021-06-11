const axios = require('axios');
const dayjs = require('dayjs');
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

// stkValuation('601878', 1, 500);
// https://segmentfault.com/a/1190000022950559

const knexConfig = {
  client: 'mysql',
  connection: {
    host: '47.95.230.67',
    user: 'dev_writer',
    password: '123456',
    database: 'fuquant',
  },
};

const knex = require('knex')(knexConfig);

const blukInsertSecurity = async (dataArray) => {
  try {
    logger.info('start to bulk insert.');
    const insertedRows = await knex('security_valuation').insert(dataArray);
    logger.info(insertedRows);
  } catch (error) {
    logger.error(error);
  }
};

function normalizeArray(dataArray, latestDate) {
  if (dataArray) {
    return dataArray
      .filter((obj) => dayjs(obj.TRADEDATE).diff(latestDate) > 0)
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
  }
  return dataArray;
}

const fetchMktvalue = async (securityCode) => {
  try {
    const latestRecord = await knex('security_valuation').select().from('security_valuation').where('security_code', securityCode)
      .limit(1)
      .orderBy('trade_date', 'desc');
    let pageSize = 50;
    let page = 1;
    let loopFetch = true;

    if (latestRecord.length > 0) {
      logger.info(`the lastRecord is ${latestRecord[0].trade_date}`);
      const lastRecordDate = dayjs(latestRecord[0].trade_date).format('YYYY-MM-DD');
      pageSize = dayjs().diff(lastRecordDate, 'day');
      logger.info(`the page size is ${pageSize}`);
      loopFetch = false;
    }
    if (pageSize < 1) {
      logger.info('No fetch needed.');
      process.exit(1);
    }

    const resp = await axios.get(`http://dcfm.eastmoney.com/em_mutisvcexpandinterface/api/js/get?st=TRADEDATE&sr=-1&ps=${pageSize}&p=${page}&type=GZFX_GGZB&token=894050c76af8597a853f5b408b759f5d&js={"data":(x),"pages":(tp)}&filter=(SECURITYCODE=^${securityCode}^)`);
    const { headers } = resp;
    const contentType = headers['content-type'];
    if (contentType && contentType.includes('text/plain')) {
      const result = JSON.parse(JSON.stringify(resp.data));
      const { pages, data } = result;
      const finalResult = normalizeArray(data,
        latestRecord.length === 0 ? dayjs('2021-01-01') : dayjs(latestRecord[0].trade_date));
      logger.info(`the final result's length is ${finalResult.length} and loopFetch: ${loopFetch}, the pages:${pages}`);
      blukInsertSecurity(finalResult);
      let i = 0;
      if (loopFetch) {
        for (i = pages; i >= 2; i--) {
          page = i;
          logger.info('start to loop fetch.');
          axios.get(`http://dcfm.eastmoney.com/em_mutisvcexpandinterface/api/js/get?st=TRADEDATE&sr=-1&ps=${pageSize}&p=${page}&type=GZFX_GGZB&token=894050c76af8597a853f5b408b759f5d&js={"data":(x),"pages":(tp)}&filter=(SECURITYCODE=^${securityCode}^)`)
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
    logger.error(error);
  }
};

fetchMktvalue('601878');
