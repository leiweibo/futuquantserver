const { Sequelize } = require('sequelize');
const numeral = require('numeral');
const dayjs = require('dayjs');
const db = require('../db');

const northTransactionDetail = db.define(
  'north_transaction_detail',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'id 自增长',
    },
    security_mkt: {
      type: Sequelize.STRING,
    },
    trade_date: {
      type: Sequelize.DATE,
    },
    buy_trades: {
      type: Sequelize.FLOAT,
    },
    sell_trades: {
      type: Sequelize.FLOAT,
    },
    turnover_trades: {
      type: Sequelize.FLOAT,
    },
    sum_buysell_amt: {
      type: Sequelize.INTEGER,
    },
    buy_amt: {
      type: Sequelize.INTEGER,
    },
    sell_amt: {
      type: Sequelize.INTEGER,
    },
    daily_quota_balance: {
      type: Sequelize.FLOAT,
    },
    daily_quota_balance_percet: {
      type: Sequelize.FLOAT,
    },
  },
  {
    tableName: 'north_transaction_detail',
    createdAt: false,
    updatedAt: false,
    timestamps: false,
  },
);

const normalizeArray = (dataArray) => {
  if (dataArray) {
    return dataArray
      .map((obj) => {
        const rObj = {};
        rObj.trade_date = dayjs(obj.tradeDate).format('YYYY/MM/DD');
        rObj.buy_trades = numeral(obj.buyTrades).value();
        rObj.turnover_trades = numeral(obj.turnoverTrades).value();
        rObj.sell_trades = numeral(obj.sellTrades).value();
        rObj.sum_buysell_amt = numeral(obj.sumBuysellAmt).value();
        rObj.buy_amt = numeral(obj.buyAmt).value();
        rObj.sell_amt = numeral(obj.sellAmt).value();
        rObj.daily_quota_balance = numeral(obj.dailyQuotaBalance).value();
        rObj.daily_quota_balance_percet = numeral(obj.dailyQuotaBalancePercet).value();
        rObj.security_mkt = obj.realMkt === 'sz' ? '22' : '21';
        return rObj;
      });
  }
  return dataArray;
};

module.exports = { normalizeArray, northTransactionDetail };
