const CustomPrototype = require('./models/CustomPrototype');
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');

const createError = require('http-errors');

const { app_config } = require('../config/config');
const firebase = require('../config/firebase');
const locales = require('./locales/index'); // Init locale
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const { errorHandler } = require('./models/HttpError');
const cors = require('cors')

const fs = require('fs');
const http = require('http');
const https = require('https');
const privateKey  = fs.readFileSync('ssl/certificate-key.pem', 'utf8');
const certificate = fs.readFileSync('ssl/certificate.pem', 'utf8');

const credentials = {key: privateKey, cert: certificate};

const app = express();
const http_port = app_config.http_port;
const https_port = app_config.https_port;

app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
)
app.use(passport.initialize());
app.use(passport.session());

// CORS for dev
app.use(cors())

app.use('/', indexRouter);
app.use('/api', apiRouter);

// handle 404
app.use(function(req, res, next) {
  res.status(404).send({success: false, msg: "Unknown route"})
});

// handler error
app.use(errorHandler);


var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(http_port, () => {
	console.log(`App http running on port ${http_port}.`)
});
httpsServer.listen(https_port, () => {
	console.log(`App https running on port ${https_port}.`)
});


global.HttpError = require('./models/HttpError').HttpError;
global.firebase = firebase;
global.dev = true;
global.optimal_score = 10;

// Init matching service
var match = require('./services/match');