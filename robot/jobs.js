const schedule = require('node-schedule');
const { start } = require('./northtransaction_detail');

// 定义规则
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [1, 2, 3, 4, 5];
rule.hour = 17;
rule.minute = 45;
rule.second = 0;

schedule.scheduleJob(rule, () => {
  console.log(`execute start() at ${Date()}`);
  start();
});
