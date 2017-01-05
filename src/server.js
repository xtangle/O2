var express = require('express');
var path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var connectionManager = require('./connection-manager');

var app = express();

// initialize the database connection
connectionManager.init();

// serve our static content out of ./public
app.use(express.static(path.resolve(__dirname, 'public')));

// serve our RESTful services
var router = express.Router();
router.get('/transactions', function(req, res) {
  var Transaction = require('./transaction/transaction-model');
  Transaction.find({}, function(err, transactions) {
    if (err) throw err;
    res.json({
      message: 'hooray! welcome to our api!',
      transactions: transactions
    });
  });
});
app.use('/api', router);

// start server on the specified port and binding host
var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, appEnv.bind, function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});