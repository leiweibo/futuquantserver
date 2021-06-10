const axios = require('axios');

const stkValuation = async (securityCode, page, pageSize) => {
  try {
    const resp = await axios.get(`http://dcfm.eastmoney.com/em_mutisvcexpandinterface/api/js/get?st=TRADEDATE&sr=-1&ps=${pageSize}&p=${page}&type=GZFX_GGZB&token=894050c76af8597a853f5b408b759f5d&js={"data":(x),"pages":(tp)}&filter=(SECURITYCODE=^${securityCode}^)`)
    const contentType = resp['headers']['content-type'];
    if (contentType && contentType.includes('text/plain')) {
      const result = JSON.parse(JSON.stringify(resp.data));
      console.log(result.data);
    }
  } catch (error) {
    console.error(error);
  }
};
// stkValuation('601878', 1, 500);
// https://segmentfault.com/a/1190000022950559

const knexConfig = {
  client: 'mysql',
  connection: {
    host: '47.95.230.67',
    user: 'root',
    password: '123123lei',
    database: 'fuquant',
  },
};

const knex = require('knex')(knexConfig);

const insertSecurity = async (securityCode) => {
  try {
    const insertedRows = await knex('security_valuation').insert({ security_code: securityCode });
    console.log(insertedRows);
  } catch (error) {
    console.log(error);
  }
};
insertSecurity('601878');
