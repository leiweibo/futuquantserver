const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const db = require('../db');

const securityValuation = db.define(
  'security_valuation',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'id 自增长',
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
    trade_date: {
      type: Sequelize.DATE,
    },
    close_price: {
      type: Sequelize.FLOAT,
    },
    change_rate: {
      type: Sequelize.FLOAT,
    },
    mkt_value: {
      type: Sequelize.DECIMAL(32, 3),
    },
    traded_mkt_value: {
      type: Sequelize.DECIMAL(32, 3),
    },
    total_equity: {
      type: Sequelize.DECIMAL(32, 0),
    },
    total_traded_equity: {
      type: Sequelize.DECIMAL(32, 0),
    },
    pe_ttm: {
      type: Sequelize.DOUBLE,
    },
    pe_static: {
      type: Sequelize.DOUBLE,
    },
    pb: {
      type: Sequelize.DOUBLE,
    },
    peg: {
      type: Sequelize.DOUBLE,
    },
    pcf: {
      type: Sequelize.STRING,
    },
    pts: {
      type: Sequelize.STRING,
    },
  },
  {
    tableName: 'security_valuation',
    createdAt: false,
    updatedAt: false,
    timestamps: false,
  },
);

const normalizeArray = (dataArray, latestDate) => {
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
};

module.exports = { securityValuation, normalizeArray };
