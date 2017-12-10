/* eslint-disable new-cap, no-console */
// LIBRARIES
const dotenv = require('dotenv');
const _ = require('lodash');
const Promise = require('bluebird');
const express = require('express');
// const request = require('request');
const requestIp = require('request-ip');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const moment = require('moment');
const tinyid = require('tinyid');

dotenv.load();

// COMPONENTS
const cache = require('./components/cache');
// const binSchema = require('./schema/bin_schema');
// const requestsSchema = require('./schema/requests_schema');

const app = express();
const port = Number(process.env.PORT || 3000);

/* ***************************** EXPRESS SETUP ****************************** */

app.use(requestIp.mw());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('json spaces', 2);
app.enable('trust proxy');

/* ***************************** EXPRESS ROUTES ***************************** */

// Home
app.all('/', (req, res) => {
  // TODO: render front-end view
  res.send('home');
});

// Create Bin
app.all('/create/bin', (req, res) => {
  const binName = _.toLower(tinyid.encode(moment().unix()));
  const binKey = `bin_${binName}`;
  const binData = {
    name: binName,
    created: moment().unix(),
    requests: [],
    color: 'red', // TODO: random_color()
    favicon_uri: '', // TODO?
    private: false, // TODO
    secret_key: '', // TODO: os.urandom(24) if private else
  };
  storeBin(binKey, binData).then(() => res.redirect(`/bin/${binName}?inspect`));
});

// Bin Route (Inspect & Log Request)
app.all('/bin/:bin', (req, res) => {
  if (!req.params.bin) {
    return res.status(401).json({ error: 'Bin is required.' });
  }
  const binName = req.params.bin;
  const isInspect = _.indexOf(_.keys(req.query), 'inspect') !== -1;

  return getBin(binName).then((binData) => {
    if (isInspect) {
      // Render Front-End View // TODO
      return res.json(binData);
    }

    // Log Incoming Request
    return formatRequest(req).then((formattedRequestData) => {
      binData.requests.push(formattedRequestData);
      const binRequests = _.reverse(_.sortBy(binData.requests, ['time']));
      binData.requests = binRequests;
      // TODO: reduce/limit requests array to something like 20-50 requests.
      const binKey = `bin_${binData.name}`;
      return storeBin(binKey, binData).then((result) => res.send('ok'));
    });
  });
});

/* ****************************** HELPER FUNCTIONS ************************** */

function getBin(binId) {
  const binKey = `bin_${binId}`;
  return new Promise((resolve, reject) => {
    cache.get(binKey, (err, binData) => {
      if (err) {
        reject(err);
      }
      resolve(JSON.parse(binData));
    });
  });
}

function storeBin(binKey, binData) {
  const stringifiedBinData = JSON.stringify(binData);
  return new Promise((resolve, reject) => {
    cache.set(binKey, stringifiedBinData, (err, value) => {
      if (err) {
        reject(err);
      }
      getBin(binData.name).then((binData) => resolve(binData));
    });
  });
}

function formatRequest(req) {
  return new Promise((resolve) => {
    const contentTypeHeader = req.get('content-type');

    const originalUrl = req.originalUrl || null;
    const urlParts = (req.originalUrl) ? _.split(originalUrl, '?', 2) : null;
    const urlPath = (urlParts && urlParts[0]) || req.params[0] || null;
    const urlQueryString = (urlParts && urlParts[1]) ? `?${urlParts[1]}` : null;

    const formattedData = {
      id: _.toLower(tinyid.encode(moment().unix())),
      method: req.method || null,
      url: {
        base_url: req.hostname || null,
        original_url: req.originalUrl || null,
        path: urlPath,
        query_string: urlQueryString,
      },
      query_string: req.query || {},
      content_type: (req.is(contentTypeHeader) && contentTypeHeader) || null,
      content_length: req.get('content-length') || req.length || null,
      time: moment().unix(),
      remote_addr: req.clientIp || req.ip || null,
      form_data: null, // TODO: multer? https://stackoverflow.com/questions/37630419/how-to-handle-formdata-from-express-4
      query_string: req.query || {},
      headers: req.headers || {},
      raw: null,
      body: req.body || {},
    };
    resolve(formattedData);
  });
}

/* ****************************** SERVER LISTEN ***************************** */

app.listen(port, () => {
  console.log(`App server is running on http://localhost:${port}`);
});
