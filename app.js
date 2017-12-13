/* eslint-disable new-cap, no-console, no-param-reassign, no-unused-vars */
// LIBRARIES
const dotenv = require('dotenv');
const _ = require('lodash');
const Promise = require('bluebird');
const path = require('path');
const express = require('express');
const cors = require('cors')
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const favicon = require('serve-favicon');
const requestIp = require('request-ip');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const Pusher = require('pusher');
const moment = require('moment');
const tinyid = require('tinyid');
const randomColor = require('randomcolor');

// COMPONENTS
const cache = require('./components/cache');

dotenv.load();
const app = express();
const port = Number(process.env.PORT || 3000);

/* ****************************** PUSHER SETUP ****************************** */

const pusher = new Pusher({ // TODO: set these in environment variales
  appId: '443219',
  key: 'e9a9bffb6fabc04ed457',
  secret: '3d46ecae363faad7bf80',
  cluster: 'us2',
  encrypted: true,
});

/* ***************************** EXPRESS SETUP ****************************** */

app.use(cors());
app.use(requestIp.mw());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('json spaces', 2);
app.enable('trust proxy');

app.use(session({
  store: new RedisStore({
    client: cache,
    // host: process.env.REDIS_HOST || 'ec2-34-227-234-245.compute-1.amazonaws.com',
    // port: process.env.REDIS_PORT || 55269,
  }),
  secret: 'hooksarefun',
  resave: false,
  cookie: {
    maxAge: 7776000000,
  },
  bins: [],
}));

/* ***************************** EXPRESS ROUTES ***************************** */

// Home
app.all('/', (req, res) => {
  // console.log('req.session', req.session);
  const currentHost = (req.hostname === 'localhost') ? `localhost:${port}` : req.hostname;

  console.log(req.session.bins);

  res.render('index.ejs', {
    currentHostUrl: `${req.protocol}://${currentHost}`,
    sessionBins: req.session.bins || [],
  });
});

// Create Bin
app.all('/create/bin', (req, res) => {
  const binName = _.toLower(tinyid.encode(moment().unix()));
  const binKey = `bin_${binName}`;
  const binData = {
    id: binName,
    name: null,
    originIp: req.clientIp || req.ip || null,
    created: moment().unix(),
    requests: [],
    color: randomColor(),
    favicon_uri: '', // TODO?
    private: false, // TODO
    secret_key: '', // TODO: os.urandom(24) if private else
  };

  // Update Session Storage
  if (req.session.bins) { // TODO: also check if is array?
    req.session.bins.push(binKey);
  } else {
    req.session.bins = [binKey];
  }

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
      const currentHost = (req.hostname === 'localhost') ? `localhost:${port}` : req.hostname;
      return res.render('bin.ejs', {
        currentUrl: `${req.protocol}://${currentHost}/bin/${binName}`,
        currentHostUrl: `${req.protocol}://${currentHost}`,
        binId: binName,
      });
    }

    // Log Incoming Request
    return formatRequest(req).then((formattedRequestData) => {
      binData.requests.push(formattedRequestData);
      const binRequests = _.reverse(_.sortBy(binData.requests, ['time']));
      binData.requests = binRequests;
      // TODO: reduce/limit requests array to something like 20-50 requests.
      const binKey = `bin_${binData.id}`;
      return storeBin(binKey, binData).then((result) => res.send('ok'));
    });
  });
});

// API: Get All Bins (Without Requests Included)
app.all('/api/bins', (req, res) => {
  getAllBins().then((binKeys) => res.json(binKeys));
});

// API: Get Bin by ID
app.get('/api/bin/:bin', (req, res) => {
  // res.append('Access-Control-Allow-Origin', '*');
  if (!req.params.bin) {
    return res.status(401).json({ error: 'Bin is required.' });
  }
  const binName = req.params.bin;
  return getBin(binName).then((binData) => res.json(binData));
});

// API: Update Bin by ID
app.put('/api/bin/:bin', (req, res) => {
  if (!req.params.bin) {
    return res.status(401).json({ error: 'Bin is required.' });
  }
  const binName = req.params.bin;
  return getBin(binName).then((binData) => {
    const binKey = `bin_${binData.id}`;
    binData.name = req.body.name || binData.name;
    console.log('req.body', binData);
    return storeBin(binKey, binData).then((result) => {
      const binChannel = `bin_${binName}`;
      pusher.trigger(binKey, 'bin-updated', {
        updated: true,
      });
      return res.send('ok');
    });
  });
});

// API: Update Bin by ID
app.delete('/api/bin/:bin', (req, res) => {
  if (!req.params.bin) {
    return res.status(401).json({ error: 'Bin is required.' });
  }
  const binName = req.params.bin;
  return deleteBin(binName).then(() => res.send('ok'));
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

function deleteBin(binId) {
  const binKey = `bin_${binId}`;
  return new Promise((resolve, reject) => {
    cache.del(binKey, (err, response) => {
      if (err) {
        reject(err);
      }
      resolve(response);
    });
  });
}

function getBinKeys() {
  return new Promise((resolve, reject) => {
    cache.keys('bin_*', (err, binKeys) => {
      if (err) {
        reject(err);
      }
      cache.mget(binKeys, (error, allBins) => {
        resolve(binKeys);
      });
    });
  });
}

function getAllBins() {
  return new Promise((resolve, reject) => {
    cache.keys('bin_*', (err, binKeys) => {
      if (err) {
        reject(err);
      }
      cache.mget(binKeys, (error, allBins) => {
        const binMap = _.map(allBins, (currentBinObject) => {
          const bin = JSON.parse(currentBinObject);
          bin.requests_total = bin.requests.length;
          bin.requests = [];
          return bin;
        });
        resolve(binMap);
      });
    });
  });
}

function storeBin(binKey, binData) {
  const binName = binData.id;
  return new Promise((resolve, reject) => {
    // cache.set('key', 'value!', 'EX', 10); // this key will expire after 10 seconds // TODO
    cache.set(binKey, JSON.stringify(binData), (err, value) => {
      if (err) {
        reject(err);
      }
      getBin(binName).then((bin) => {
        const binChannel = `bin_${binName}`;
        pusher.trigger(binChannel, 'bin-updated', {
          // bin: bin, // sending whole bin can exceed pusher message size, so let's just trigger a new fetch
          updated: true,
        });
        resolve(bin);
      });
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
