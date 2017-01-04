var express = require('express');
var path = require('path');
var app = express();

// first parameter is the mount point, second is the location in the file system
app.use("/static", express.static(path.resolve(__dirname, 'static')));

// viewed at http://localhost:8080
app.get('/', function(req, res) {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.listen(8080);