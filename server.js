const express = require('express');
const path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
const cfenv = require('cfenv');
const connectionManager = require('./src/connection-manager');
const moment = require('moment');
const Transaction = require('./src/transaction/transaction-model');

var app = express();
var appEnv = cfenv.getAppEnv();

// initialize the database connection
connectionManager.init();

// serve the files out of ./public as our main files
app.use(express.static(path.resolve(__dirname, 'src/public')));

// serve transactions summary pages
app.get('/transactions', function (req, res) {
  var currencyCode = req.query.curr;
  Transaction.find({Settlement_Currency: currencyCode})
    .sort({Received_Date_and_Time: -1})
    .exec(function (err, transactions) {
      if (err) throw err;
      res.send(
        '<html>' +
        '<h1>Transactions in ' + currencyCode + '</h1>' +
        (transactions && transactions.length > 0
            ?
            '<ul>' +
            transactions.map(function (t) {
              return '<li>' +
                'Amount: ' + t['Net_Settlement_Amount'] + ', ' +
                'Date: ' + t['Received_Date_and_Time'] +
                '</li>';
            }).join('') +
            '</ul>'
            :
            '<h3>No transactions found</h3>'
        ) +
        '</html>'
      );
    })
});

// serve our RESTful services
var apiRouter = express.Router();
apiRouter.get('/transactions', function (req, res) {
  Transaction.find({}, function (err, transactions) {
    if (err) throw err;
    res.json({
      message: 'hooray! welcome to our api!',
      transactions: transactions
    });
  });
});
app.use('/api', apiRouter);

// Socket.io
var server = require('http').Server(app);
var io = require('socket.io')(server);
io.on('connection', function (socket) {
  console.log('new connection made');

  var currencies = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'JPY', 'INR', 'AUD'];
  var sigma = 100000, mu = 5000;

  function randNorm() {
    var u = 1 - Math.random();
    var v = 1 - Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function getRandomCurrency() {
    return currencies[Math.floor(Math.random() * currencies.length)];
  }

  function getRandomAmount() {
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