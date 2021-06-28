const { Sequelize } = require('sequelize');

const db = new Sequelize('fuquant', 'dev_writer', '123456', {
  host: '47.95.230.67',
  port: '3306',
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  logging: false,
});

module.exports = db;
