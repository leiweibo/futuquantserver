const { Sequelize } = require('sequelize');
const numeral = require('numeral');
const db = require('../db');

const northHolding = db.define(
  'north_holding',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'id 自增长',
    },
    trade_date: {
      type: Sequelize.DATE,
    },
    security_code: {
      type: Sequelize.STRING,
    },
    security_mkt: {
      type: Sequelize.STRING,
    },
    security_name: {
      type: Sequelize.STRING,
    },
    holding_amt_rate: {
      type: Sequelize.STRING,
    },
    holding_amt: {
      type: Sequelize.DECIMAL(32, 3),
    },
    holding_offset: {
      type: Sequelize.DECIMAL(32, 3),
    },
  },
  {
    tableName: 'north_holding',
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
        rObj.trade_date = obj.tmpDate;
        rObj.security_code = obj.code;
        rObj.security_mkt = obj.mkt;
        rObj.security_name = obj.name;
        rObj.holding_amt = numeral(obj.amt).value();
        rObj.holding_amt_rate = obj.amtPer;
        return rObj;
      });
  }
  return dataArray;
};

module.exports = { northHolding, normalizeArray };
