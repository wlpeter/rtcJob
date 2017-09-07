'use strict'

const Koa = require('koa');
const path = require('path');
const koaBody = require('koa-body');
const convert = require('koa-convert');
const views = require('koa-views');
const serve = require('koa-static');
const router = require('koa-router')();
const http = require('http');

const app = new Koa();
// 加载配置文件
const config = require('./config/index.json');
// 加载路由
const routes = require('./routes/index');
routes(router);

// 中间件
app
  .use(serve(`${__dirname}/../public/dist`, {maxage: 365 * 24 * 60 * 60}))
  .use(views(`${__dirname}/../public/views`, {map: {html: 'ejs'}}))
  .use(convert(koaBody({multipart: true, formidable: {keepExtensions: true}})))
  .use(router.routes(), router.allowedMethods());

// 创建服务
const server = http.createServer(app.callback());
// 启动通讯中心
require('./lib/socket.js')(server);
// 启动监听端口
server.listen(config.apiService.port, () => {
  console.log(`Server has started, listen for ${config.apiService.port}`);
});

// 错误捕捉
app.on('error', err => {
  console.error(err);
});

module.exports = app;