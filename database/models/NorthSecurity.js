const { Sequelize } = require('sequelize');
const db = require('../db');

const northSecurity = db.define(
  'north_holding',
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
    security_ccass_code: {
      type: Sequelize.STRING,
    },
    status: {
      type: Sequelize.INTEGER,
    },
    security_name: {
      type: Sequelize.STRING,
    },
  },
  {
    tableName: 'north_security',
    createdAt: false,
    updatedAt: false,
    timestamps: false,
  },
);

module.exports = { northSecurity };
