/* eslint-disable new-cap, no-console */
const redis = require('redis');

/* ***************************** REDIS SETUP ******************************** */

const cache = new redis.createClient({
  url: process.env.REDIS_URL,
});

module.exports = cache;
