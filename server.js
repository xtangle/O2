var express = require('express');
var path = require('path');
// cfenv provides access to your Cloud Foundry environment, for info see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = 8080;
 
// serve the files out of ./public as our main files
app.use(express.static(path.resolve(__dirname, 'public')));

var buyT = function(){
  return Math.floor((Math.random() * 100) + 1);;
};
io.on('connection', function(socket) {
  console.log('new connection made');
  var autoEmit = setInterval(function(){
    socket.emit('message-from-server', {
      transaction: {
        currency:'CAD',
        amount:buyT()
      }
    });
  }, 1000);

});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
server.listen(port, function() {
  console.log("Listening on port " + port);
});
// start server on the specified port and binding host
// app.listen(appEnv.port, '0.0.0.0', function() {
//   // print a message when the server starts listening
//   console.log("server starting on " + appEnv.url);
// });