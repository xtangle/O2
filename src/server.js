var express = require('express');
var path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var app = express();
var router = express.Router();
// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// serve our static content out of ./public
app.use(express.static(path.resolve(__dirname, 'public')));

// serve our RESTful services
router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});
app.use('/api', router);

// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});