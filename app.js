var express = require('express');
var path = require('path');
var app = express();

var port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'static')));

app.use(function (req, res) {
  res.sendfile('./static/index.html')
})

var io = require('socket.io').listen(app.listen(port))

var messages = [];

io.sockets.on('connection', function (socket) {
  socket.on('messages.read',function(){
    console.log(messages);
    socket.emit('messages.read',messages);
  });
  socket.on('messages.create',function(message){
    console.log(message);
    messages.push(message);
    io.sockets.emit('messages.add',message);
  });
});

console.log('TechNode is on port ' + port + '!');

