const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { puppeteerConfig } = require('../helpers/puppeteerhelper');

dayjs.extend(utc);
dayjs.extend(timezone);

const start = async () => {
  const browser = await puppeteer.launch(puppeteerConfig);

  const page = await browser.newPage();
  const d = dayjs().format('YYYYMMDD');
  // const d = '20210802';
  page.on('response', async (response) => {
    if (response.status() === 200 && response.url().includes(`data_tab_daily_${d}c.js`)) {
      response.text().then(async (body) => {
        // 将返回的内容tabData=前缀去掉，并且将字符串转化为json对象
        const result = eval(`(${body.substring(10)})`);
        const finalResult = result
          .filter((data) => data.market.includes('Northbound')) // 目前只关注北向资金数据
          .map((data) => {
            const stockList = data.content[1].table.tr;
            const finalStkResult = stockList.map((stk) => {
              const stkArray = stk.td[0];
              const offsetTurnOver = Number(stkArray[3].replace(/,/g, '')) - Number(stkArray[4].replace(/,/g, ''));
              const color = offsetTurnOver > 0 ? '#FF0000' : '#458B74';
              return `- ${stkArray[2].trim()}(${String(stkArray[1])})     \n <font color=${color}>${offsetTurnOver}</font>`;
            });
            return finalStkResult;
          });
        const markdownSHRes = finalResult[0].join('\n');
        const markdownSZRes = finalResult[1].join('\n');
        const sendData = {
          msgtype: 'markdown',
          markdown: {
            title: '最新北向资金成交情况',
            text: `# 最新北向资金成交   \n   ### 沪市(单位:元)  \n ${markdownSHRes}   \n\n\n ### 深市(单位:元)  \n ${markdownSZRes}`,
          },
        };
        const resp = await axios.post('https://oapi.dingtalk.com/robot/send?access_token=9b5fa665bb9fc3b90c7966eeed2adfa6f6ffcd332d346b5866cf4554d926eec3', sendData);
        console.log(resp.data.errcode);
        if (resp.data.errcode === 0) {
          console.log('发送成功');
        } else {
          console.log('发送失败');
        }

        if (!page.isClosed()) {
          await page.close();
        }
        await browser.close();
      });
    } else if (response.status() === 404) {
      const resp = await axios.post('https://oapi.dingtalk.com/robot/send?access_token=9b5fa665bb9fc3b90c7966eeed2adfa6f6ffcd332d346b5866cf4554d926eec3', 
        {
          msgtype: 'text',
          text: {
            content: '暂无北向资金成交数据',
          },
        });
      if (resp.data.errcode === 0) {
        console.log('发送成功');
      } else {
        console.log(resp.data);
        console.log('发送失败');
      }
      await browser.close();
    }
  });

  // 开始浏览
  try {
    await page.goto(`https://www.hkex.com.hk/chi/csm/DailyStat/data_tab_daily_${d}c.js`);
  } catch (err) {
    // console.log(`catch error, and the pendingList length is ${pendingList.length}`);
  } finally {
    //
  }
};

module.exports = { start };
