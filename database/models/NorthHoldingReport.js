const { Sequelize } = require('sequelize');
const numeral = require('numeral');
const db = require('../db');

const northHoldingReports = db.define(
  'north_holding_reports',
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
    security_ccass_code: {
      type: Sequelize.STRING,
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
    offset: {
      type: Sequelize.DECIMAL(32, 3),
    },
    type: {
      type: Sequelize.INTEGER,
    }
  },
  {
    tableName: 'north_holding_reports',
    createdAt: false,
    updatedAt: false,
    timestamps: false,
  },
);


module.exports = { northHoldingReports };
