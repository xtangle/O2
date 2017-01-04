var express = require('express');
var path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var app = express();

app.enable('trust proxy');

// serve the files out of ./public as our main files
app.use(express.static(path.resolve(__dirname, 'public')));

// Add a handler to inspect the req.secure flag (see http://expressjs.com/api#req.secure).
// This allows us to know whether the request was via http or https.
app.use (function (req, res, next) {
  if (req.secure) {
    // request was via https, so do no special handling
    next();
  } else {
    // request was via http, so redirect to https
    res.redirect('https://' + req.headers.host + req.url);
  }
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});