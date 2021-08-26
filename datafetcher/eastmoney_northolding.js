/**
 * 从 http://data.eastmoney.com/hsgtcg/gzcglist.html这个页面获取数据，用来分析
 * 比如：某一日增幅最大的，未来5天的收益率怎么样。
 */
const axios = require('axios');

const generateUrl = function (ps) {
  return `https://dcfm.eastmoney.com/em_mutisvcexpandinterface/api/js/get?st=HdDate&sr=-1&ps=${ps}&p=1&type=HSGT20_SC_LS_MX&token=70f12f2f4f091e459a279469fe49eca5&js={"data":(x),"pages":(tp)}&filter=(Market='005')`
};

const start = async () => {
  const url = generateUrl(1);
  const resp = await axios.get(url);
  const { headers } = resp;
  const contentType = headers['content-type'];
  if (contentType && contentType.includes('text/plain')) {
    const result = JSON.parse(JSON.stringify(resp.data));
    const { data } = result;
    console.log(data);
  }
};

(async () => {
  await start();
})();