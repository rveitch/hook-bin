/* eslint-disable new-cap, no-console */
const dotenv = require('dotenv');
const redis = require('redis');

dotenv.load();

/* ***************************** REDIS SETUP ******************************** */

// Alternate Option: https://www.npmjs.com/package/heroku-redis-client
const cache = new redis.createClient({
  host: process.env.REDIS_HOST || 'ec2-34-227-234-245.compute-1.amazonaws.com',
  port: process.env.REDIS_PORT || 55269,
  password: process.env.REDIS_PASS || 'p575153eda74ec03b143edefdb5a11192636afc6ee5db2ed354967c0bbfe09e99',
});

module.exports = cache;

//module.exports = {};

//const Webhooks = {};
// module.exports = Webhooks;
