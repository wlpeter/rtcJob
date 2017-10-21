'use strict'
const wrap = require('co').wrap;
const job = require('../controllers/index.js');

module.exports = function (router) {
  router.get('/', job.index);
  router.all('*', (ctx) => {
    console.log(ctx.request.query);
    console.log(ctx.request.body);
    return ctx.body = 'hello';
  });
}