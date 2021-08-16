const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const { northTransactionDetail } = require('../database/models/NorthTransactionDetail');
const { xueqiuClient } = require('../providers/xueqiu/xueqiuclient');

const start = async () => {
  const rows = await northTransactionDetail.findAll({
    attributes: [
      'trade_date',
      'security_mkt',
      [Sequelize.fn('sum', Sequelize.literal('(buy_trades - sell_trades)')), 'net_income'],
    ],
    group: [
      ['trade_date'], ['security_mkt'],
    ],
    having: Sequelize.literal('security_mkt LIKE "% Northbound"'),
  });
  const tmpResult = rows.map((r) => r.dataValues);
  const norhtbondResult = new Map();
  tmpResult.forEach((result) => {
    const targetDate = dayjs(result.trade_date).format('YYYY-MM-DD');
    if (result.net_income) {
      if (norhtbondResult.has(targetDate)) {
        const newVal = Number(norhtbondResult.get(targetDate)
         + Number(result.net_income)).toFixed(2);
        norhtbondResult.set(targetDate, newVal);
      } else {
        norhtbondResult.set(targetDate, parseFloat(result.net_income));
      }
    }
  });
  const dateArray = Array.from(norhtbondResult.keys());
  const endDate = dateArray.slice(-1)[0];
  const startDate = dateArray[0];
  const etf50Klines = await xueqiuClient('SH510500', startDate, endDate);
  const klineMap = new Map();
  etf50Klines.data.item.forEach((kline) => {
    const date = dayjs(kline[0]).format('YYYY-MM-DD');
    klineMap.set(date, {
      open: kline[2],
      close: kline[5],
      low: kline[4],
      high: kline[3],
    });
    return 0;
  });

  // 起始资金 10,000,000.00，达到条件开始执行买卖操作
  let balance = 100000;
  const operationRatio = 1;
  let holdingAmt = 0;
  const operationList = [];
  const targetTradeResult = [...norhtbondResult].filter((r) => (r[1] >= 5000 || r[1] <= -5000));
  targetTradeResult.forEach((t) => {
    const kline = klineMap.get(t[0]);
    if (t[1] > 0) {
      // 买入操作：当天收盘价买入
      let buyAmt = (balance * operationRatio) / kline.close;
      buyAmt -= buyAmt % 100;
      balance -= buyAmt * kline.close;
      if (buyAmt > 0) {
        holdingAmt += buyAmt;
        operationList.push({
          date: t[0],
          prices: kline,
          operationAmount: buyAmt,
          holdingAmount: holdingAmt,
          finalBalance: balance,
        });
      }
    } else {
      console.log('');
      // 卖出操作
      if (holdingAmt > 0 && holdingAmt * operationRatio <= 100) {
        balance += holdingAmt * kline.close;
        holdingAmt -= holdingAmt;
        operationList.push({
          date: t[0],
          prices: kline,
          operationAmount: -holdingAmt,
          holdingAmount: holdingAmt,
          finalBalance: balance,
        });
      } else if (holdingAmt > 0) {
        const sellAmt = ((holdingAmt * operationRatio) - ((holdingAmt * operationRatio) % 100));
        balance += (sellAmt * kline.close);
        holdingAmt -= sellAmt;
        operationList.push({
          date: t[0],
          prices: kline,
          operationAmount: -sellAmt,
          holdingAmount: holdingAmt,
          finalBalance: balance,
        });
      }
    }
  });
  // console.log(operationList);
  const latestKline = etf50Klines.data.item.slice(-1)[0];
  const ratio = (holdingAmt * latestKline[5] + balance - 100000) / 100000;
  console.log(operationList);
  console.log(`holding amount is: ${holdingAmt}`);
  console.log(`balance is: ${balance.toFixed(2)}`);
  console.log(`收益率为:${ratio}`);
};

(async () => {
  start();
})();
