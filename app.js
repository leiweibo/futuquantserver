const Koa = require('koa');

const app = new Koa();

const koabody = require('koa-body');
const json = require('koa-json');
const logger = require('koa-logger');
const routers = require('./routers/index');

app.use(koabody());
app.use(json());
app.use(logger());

app.use(routers.routes()).use(routers.allowedMethods());

app.listen(3000);
