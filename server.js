var express = require('express');
var path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var connectionManager = require('./src/connection-manager');
var moment = require('moment');

var app = express();
var appEnv = cfenv.getAppEnv();

// initialize the database connection
connectionManager.init();

// serve the files out of ./public as our main files
app.use(express.static(path.resolve(__dirname, 'src/public')));

// serve our RESTful services
var router = express.Router();
router.get('/transactions', function(req, res) {
  var Transaction = require('./src/transaction/transaction-model');
  Transaction.find({}, function(err, transactions) {
    if (err) throw err;
    res.json({
      message: 'hooray! welcome to our api!',
      transactions: transactions
    });
  });
});
app.use('/api', router);

// Socket.io
var server = require('http').Server(app);
var io = require('socket.io')(server);
io.on('connection', function(socket) {
  console.log('new connection made');

  var currencies = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'JPY', 'INR', 'AUD'];
  var minAmount = 1000, maxAmount = 1000000;

  function getRandomCurrency() {
    return currencies[Math.floor(Math.random() * currencies.length)];
  }

  function getRandomAmount() {
    var amount = Math.floor(Math.random() * (maxAmount - minAmount)) + minAmount;
    var sign = Math.random() < 0.5 ? -1 : 1;
    return sign * amount;
  }

  var autoEmit = setInterval(function() {
    socket.emit('message-from-server', {
      transaction: {
        settlementCurrency: getRandomCurrency(),
        netSettlementAmount: getRandomAmount(),
        receivedDateAndTime: moment().format()
      }
    });
  }, 1000);
});

// start server on the specified port and binding host
server.listen(appEnv.port, appEnv.bind, function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});