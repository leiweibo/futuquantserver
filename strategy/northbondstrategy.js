const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const { northTransactionDetail } = require('../database/models/NorthTransactionDetail');
const { xueqiuClient } = require('../providers/xueqiu/xueqiuclient');

/**
 * 近三日北向资金累计流出超过50亿元则以当日收盘价卖出，累计流入超过50亿元则以当日收盘价买入。
 * @param {*} securityCode 对比的股票代码
 * @param {*} initBalance 起始资金
 * @param {*} buyRatio 购买金额比例
 * @param {*} sellRatio 卖出股票比例
 * @returns 收益率列表，包含当天的收盘价
 */
const strategy1 = async (securityCode, nDays, initBalance, buyRatio, sellRatio) => {
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
  const etf50Klines = await xueqiuClient(securityCode, startDate, endDate);
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
  const nDaysMap = new Map();
  const valueArray = Array.from(norhtbondResult.values()).reverse();
  valueArray.forEach((val, index) => {
    let nDaysTotalResult = 0;
    for (let i = 1; i < nDays; i++) {
      nDaysTotalResult += Number((((index + i) <= valueArray.length - 1) ? valueArray[index + i] : '0.0'));
    }
    const result = Number(val) + Number(nDaysTotalResult);
    nDaysMap.set(dateArray[valueArray.length - index - 1], result.toFixed(2));
    return result;
  });
  const targetTradeResult = [...nDaysMap].filter((r) => (r[1] >= 5000 || r[1] <= -5000));
  // 起始资金 10,000,000.00，达到条件开始执行买卖操作
  let balance = initBalance;
  let holdingAmt = 0;
  // the operation list showed for test purpose.
  const operationList = [];
  const profitList = [];
  targetTradeResult.forEach((t) => {
    const kline = klineMap.get(t[0]);
    let operateAmt = 0;
    let doOperate = false; // 是否有做操作
    if (t[1] > 0) {
      // 买入操作：当天收盘价买入
      operateAmt = (balance * buyRatio) / kline.close;
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
      if (holdingAmt > 0 && holdingAmt * sellRatio <= 100) {
        balance += holdingAmt * kline.close;
        holdingAmt -= holdingAmt;
        operateAmt = -holdingAmt;
        doOperate = true;
      } else if (holdingAmt > 0) {
        operateAmt = ((holdingAmt * sellRatio) - ((holdingAmt * sellRatio) % 100));
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
      northBounds: t[1],
      prices: kline.close,
      operationAmount: operateAmt,
      holdingAmount: holdingAmt,
      finalBalance: balance,
      profit: ((balance + holdingAmt * kline.close - initBalance) / initBalance).toFixed(3),
    });
  });
  const tradeDateArray = Array.from(klineMap.keys());
  let curProfit = null;
  const finalProfitList = [];
  tradeDateArray.forEach((date) => {
    const profit = profitList.find((p) => p.date === date);
    if (profit) {
      curProfit = profit;
    }

    if (curProfit && klineMap.get(curProfit.date)) {
      const tmpProfit = { ...curProfit };
      tmpProfit.date = date;
      tmpProfit.close = klineMap.get(date).close;
      tmpProfit.profit = ((tmpProfit.finalBalance
        + tmpProfit.holdingAmount * klineMap.get(date).close - initBalance)
        / initBalance).toFixed(3);

      tmpProfit.finalBalance = tmpProfit.finalBalance.toFixed(2);
      finalProfitList.push(tmpProfit);
    } else {
      finalProfitList.push({
        date,
        northBounds: norhtbondResult.get(date), // 这个数据没有去获取
        operationAmount: 0,
        holdingAmount: 0,
        close: klineMap.get(date).close,
        finalBalance: initBalance.toFixed(2),
        profit: '0.000',
      });
    }
  });
  return finalProfitList;
};

// (async () => {
//   const result = await strategy2('SH510500', 3, 100000, 0.5, 0.5);
//   console.log(result);
// })();
module.exports = { strategy1 };
