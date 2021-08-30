const schedule = require('node-schedule');
const { startEastmoneyNortholding } = require('./eastmoney_northolding');
const { startNorthHolding } = require('./northholding');
const { startNorthTransactionDetail } = require('./northtransition_detail');

// rule for eastmoney_northolding
const rule1 = new schedule.RecurrenceRule();
rule1.dayOfWeek = [2, 3, 4, 5, 6];
rule1.hour = 6;
rule1.minute = 30;
rule1.second = 0;

schedule.scheduleJob(rule1, () => {
  console.log(`execute startEastmoneyNortholding() at ${Date()}`);
  startEastmoneyNortholding();
});

// rule for start north holding, that get the data from hkex;
const rule2 = new schedule.RecurrenceRule();
rule2.dayOfWeek = [2, 3, 4, 5, 6];
rule2.hour = 6;
rule2.minute = 30;
rule2.second = 0;

schedule.scheduleJob(rule2, () => {
  console.log(`execute startNorthHolding() at ${Date()}`);
  startNorthHolding('sh');
  startNorthHolding('sz');
});

// rule for start north holding, that get the data from hkex;
const rule3 = new schedule.RecurrenceRule();
rule3.dayOfWeek = [1, 2, 3, 4, 5];
rule3.hour = 17;
rule3.minute = 50;
rule3.second = 0;
schedule.scheduleJob(rule3, () => {
  console.log(`execute startNorthTransactionDetail() at ${Date()}`);
  startNorthTransactionDetail();
});
