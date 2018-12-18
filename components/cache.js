/* eslint-disable new-cap, no-console */
const redis = require('redis');

/* ***************************** REDIS SETUP ******************************** */

const cache = new redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASS,
});

module.exports = cache;
