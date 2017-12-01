'use strict';

var express = require('express');
var redis = require("redis");
var request = require('request');
var requestIp = require('request-ip');
var rangeCheck = require('range_check');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var moment = require('moment');
var tinyid = require('tinyid');

const binSchema = require('./schema/bin_schema');
const requestsSchema = require('./schema/requests_schema');

var app = express();
var port = Number(process.env.PORT || 3000);

/******************** EXPRESS SETUP ***********************/

app.use(requestIp.mw());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.set('json spaces', 2); // Set Express to pretty print json
app.enable('trust proxy');
console.log('trust proxy: ' + app.get('trust proxy'));

var cache = new redis.createClient({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS
});

// REDIS_URL : redis://h:p3db005a97da8294295f0c5049a3b3a8883504a5acd20e121c8bc9f6ab6e6f98b@ec2-34-204-242-91.compute-1.amazonaws.com:56449

/******************** EXPRESS ENDPOINTS ********************/

// Default Endpoint
app.all('*', function (req, res) { // app.use('*', function (req, res) {
  const contentTypeHeader = req.get('content-type');

  var binRequestInfo = {
    id: '',
    method: req.protocol || null,
    base_url: req.hostname || null,
    path: req.params[0] || req.originalUrl, // TODO: (need to split our query string)
    content_type: (req.is(contentTypeHeader) && contentTypeHeader) || null,
    content_length: req.get('content-length') || req.length || null,
    time: moment().unix(),
    remote_addr: req.ip || req.clientIp || null,
    form_data: '', // TODO: multer? https://stackoverflow.com/questions/37630419/how-to-handle-formdata-from-express-4
    query_string: req.query || {},
    headers: req.headers || {},
    raw: req.body, // TODO: remove?
    body: req.body,
  };

	console.log(binRequestInfo);

	if (req.query.challenge) {
		res.send(req.query.challenge); // TODO: replace this with front end or OK
	} else {
		res.json(binRequestInfo);
	}

});

/******************************** SERVER LISTEN *******************************/

app.listen(port, function () {
	console.log('App server is running on http://localhost:' + port);
});
