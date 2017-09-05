'use strict'
const wrap = require('co').wrap;
const job = require('../controllers/index.js');

module.exports = function (router) {
  router.get('/', job.index);
  router.all('*', (ctx) => {
    return ctx.body = 'hello';
  });
}