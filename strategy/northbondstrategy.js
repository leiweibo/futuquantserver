const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const { northTransactionDetail } = require('../database/models/NorthTransactionDetail');
const { xueqiuClient } = require('../providers/xueqiu/xueqiuclient');

const strategy1 = async () => {
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
  const startBalance = 100000;
  let balance = startBalance;
  const operationRatio = 1;
  let holdingAmt = 0;
  // the operation list showed for test purpose.
  const operationList = [];
  // the profit list.
  const profitList = [];
  const targetTradeResult = [...norhtbondResult].filter((r) => (r[1] >= 5000 || r[1] <= -5000));
  targetTradeResult.forEach((t) => {
    const kline = klineMap.get(t[0]);
    let operateAmt = 0;
    let doOperate = false; // 是否有做操作
    if (t[1] > 0) {
      // 买入操作：当天收盘价买入
      operateAmt = (balance * operationRatio) / kline.close;
      operateAmt -= operateAmt % 100;
      if (operateAmt > 0) {
        balance -= operateAmt * kline.close;
        holdingAmt += operateAmt;
        doOperate = true;
      } else {
        operateAmt = 0;
      }
    } else {
      console.log('');
      // 卖出操作
      if (holdingAmt > 0 && holdingAmt * operationRatio <= 100) {
        balance += holdingAmt * kline.close;
        holdingAmt -= holdingAmt;
        operateAmt = -holdingAmt;
        doOperate = true;
      } else if (holdingAmt > 0) {
        operateAmt = ((holdingAmt * operationRatio) - ((holdingAmt * operationRatio) % 100));
        balance += (operateAmt * kline.close);
        holdingAmt -= operateAmt;
        operateAmt = -operateAmt;
        doOperate = true;
      }
    }

    if (doOperate) {
      operationList.push({
        date: t[0],
        prices: kline.close,
        operationAmount: operateAmt,
        holdingAmount: holdingAmt,
        finalBalance: balance,
        northBound: t[1],
      });
    }

    profitList.push({
      date: t[0],
      prices: kline,
      operationAmount: operateAmt,
      holdingAmount: holdingAmt,
      finalBalance: balance,
      profit: ((balance + holdingAmt * kline.close - startBalance) / startBalance).toFixed(3),
    });
  });
  // console.log(operationList);
  const latestKline = etf50Klines.data.item.slice(-1)[0];
  const ratio = (holdingAmt * latestKline[5] + balance - 100000) / 100000;
  console.log(operationList);
  console.log(`holding amount is: ${holdingAmt}`);
  console.log(`balance is: ${balance.toFixed(2)}`);
  console.log(`收益率为:${ratio}`);
  return profitList;
};

(async () => {
  const result = await strategy1();
  console.log('---------------');
  console.log(result);
})();
module.exports = { strategy1 };
