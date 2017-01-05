var express = require('express');
var path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var app = express();

// serve the files out of ./public as our main files
app.use(express.static(path.resolve(__dirname, 'public')));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("web server starting on " + appEnv.url);
});