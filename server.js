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
router.get('/transactions', function (req, res) {
  var Transaction = require('./src/transaction/transaction-model');
  Transaction.find({}, function (err, transactions) {
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
io.on('connection', function (socket) {
  console.log('new connection made');

  var currencies = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'JPY', 'INR', 'AUD'];

  function getRandomCurrency() {
    return currencies[Math.floor(Math.random() * currencies.length)];
  }

  function getRandomAmount() {
    function randNorm() {
      var u = 1 - Math.random();
      var v = 1 - Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    var sigma = 100000, mu = 5000;
    var amount = Math.pow(randNorm(), 2) * sigma + mu;
    var sign = Math.random() < 0.49 ? -1 : 1;
    return sign * amount;
  }

  var autoEmit = setInterval(function () {
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
server.listen(appEnv.port, appEnv.bind, function () {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});