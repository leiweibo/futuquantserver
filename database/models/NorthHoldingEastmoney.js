const { Sequelize } = require('sequelize');
const db = require('../db');

const northHolding = db.define(
  'north_holding_eastmoney',
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
    etfratio: {
      type: Sequelize.DECIMAL(10, 4),
    },
    today_add_mkt_val: {
      type: Sequelize.DECIMAL(32, 4),
    },
    today_add_mkt_ratio: {
      type: Sequelize.DECIMAL(12, 10),
    },
    today_mkt_val: {
      type: Sequelize.DECIMAL(32, 4),
    },
    today_mkt_ratio: {
      type: Sequelize.DECIMAL(12, 4),
    },
    max_add_plate_by_mkt_val: {
      type: Sequelize.STRING,
    },
    max_add_plate_by_ratio: {
      type: Sequelize.STRING,
    },
    max_add_by_all_ratio: {
      type: Sequelize.STRING,
    },
    max_add_by_mkt_val: {
      type: Sequelize.STRING,
    },
    max_add_by_mkt_amt: {
      type: Sequelize.STRING,
    },
    max_add_by_mkt_ratio: {
      type: Sequelize.STRING,
    },
  },
  {
    tableName: 'north_holding_eastmoney',
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
        rObj.trade_date = obj.HdDate;
        rObj.etfratio = obj.Zdf;
        rObj.today_mkt_val = obj.ShareSZ_Add;
        rObj.today_mkt_ratio = obj.ShareHoldAdd_ZB_ALL;
        rObj.today_add_mkt_val = obj.ShareSZ;
        rObj.today_add_mkt_ratio = obj.ShareHoldAdd_ZB_ALL;
        rObj.max_add_plate_by_mkt_val = obj.BKSName;
        rObj.max_add_plate_by_ratio = obj.BKProportionName;
        rObj.max_add_by_all_ratio = obj.BKMarketName;
        rObj.max_add_by_mkt_val = obj.SZName_Max;
        rObj.max_add_by_mkt_amt = obj.SharesName_Max;
        rObj.max_add_by_mkt_ratio = obj.ProportionName_Max;
        return rObj;
      });
  }
  return dataArray;
};

module.exports = { northHolding, normalizeArray };
