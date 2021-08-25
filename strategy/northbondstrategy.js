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
 * @param {*} netBuy 净流入金额 单位是百万 正数
 * @param {*} netSell 净流出金额 单位是百万 正数
 * @returns 收益率列表，包含当天的收盘价
 */
const strategy1 = async (securityCode, days, initBalance, buyRatio, sellRatio, netBuy, netSell) => {
  // sql返回所有北向资金的数据，包含指定日期下，两个市场各自的净流入资金数据
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
  // 将sql返回来的结果，用数组过滤出来。
  const tmpResult = rows.map((r) => r.dataValues);
  const norhtbondResult = new Map();
  // 合并两个市场的流入资金，存入到norhtbondResult里面
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
  // 北向资金数据的日期数据
  const dateArray = Array.from(norhtbondResult.keys());
  // 获取结束日期
  const endDate = dateArray.slice(-1)[0];
  // 获取开始日期
  const startDate = dateArray[0];
  // 获取目标etf行情
  const etf50Klines = await xueqiuClient(securityCode, startDate, endDate);
  const klineMap = new Map();
  // 将行情数据存到map中
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
    for (let i = 1; i < days; i++) {
      nDaysTotalResult += Number((((index + i) <= valueArray.length - 1) ? valueArray[index + i] : '0.0'));
    }
    const result = Number(val) + Number(nDaysTotalResult);
    nDaysMap.set(dateArray[valueArray.length - index - 1], result.toFixed(2));
    return result;
  });
  const targetTradeResult = [...nDaysMap].filter((r) => (r[1] >= netBuy || r[1] <= netSell))
    .reverse();
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
        operationAmount: operateAmt,
        holdingAmount: holdingAmt,
        finalBalance: balance,
        northBound: t[1],
      });
    }
    profitList.push({
      date: t[0],
      northBounds: t[1],
      operationAmount: operateAmt,
      holdingAmount: holdingAmt,
      finalBalance: balance,
      close: kline.close,
    });
  });

  const finalProfitList = [];
  let curProfit = null;
  // profitList表示有操作的数据，这样把里面的operationAmount数据拿出来，并且赋值给结果数组，但这个只用一次；
  // 后面如果日期不在profit列表里面，operationAmount设置为0
  let firstItemWithValue = false;
  dateArray.forEach((date) => {
    const profit = profitList.find((p) => p.date === date);
    if (profit) {
      firstItemWithValue = true;
      curProfit = profit;
    } else {
      firstItemWithValue = false;
    }

    if (curProfit && klineMap.get(date)) {
      const tmpProfit = { ...curProfit };
      tmpProfit.date = date;
      tmpProfit.northBounds = norhtbondResult.get(date);
      tmpProfit.operationAmount = firstItemWithValue ? curProfit.operationAmount : 0;
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
        finalBalance: initBalance.toFixed(2),
        profit: '0.000',
        close: klineMap.get(date).close,
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
