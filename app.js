var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var Controllers = require('./controllers');
var MongoStore = require('connect-mongo')(session);
var Cookie = require('cookie');
var app = express();


var port = process.env.PORT || 3000;

var sessionStore = new MongoStore({
  url:'mongodb://localhost/technode'
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret:"technode",
  cookie:{
    maxAge: 60*1000
  },
  store: sessionStore
}));
app.use(express.static(path.join(__dirname, 'static')));

app.get('/api/validate', function (req, res) {
  _userId = req.session._userId
  console.log(_userId);
  if (_userId) {
    Controllers.User.findUserById(_userId, function (err, user) {
      if (err) {
        res.json(401, {msg: err})
      } else {
        res.json(user)
      }
    })
  } else {
    res.json(401, null)
  }
})

app.post('/api/login', function (req, res) {
  email = req.body.email
  if (email) {
    Controllers.User.findByEmailOrCreate(email, function(err, user) {
      if (err) {
        res.json(500, {msg: err})
      } else  {
        req.session._userId = user._id
        Controllers.User.online(user._id, function (err, user) {
          if (err) {
            res.json(500, {
              msg: err
            })
          } else {
            res.json(user)
          }
        })
      }
    })
  } else {
    res.json(403)
  }
})

app.get('/api/logout', function(req, res) {
  _userId = req.session._userId
  Controllers.User.offline(_userId, function (err, user) {
    if (err) {
      res.json(500, {
        msg: err
      })
    } else {
      res.json(200)
      delete req.session._userId
    }
  })
})

app.use(function (req, res) {
  res.sendfile('./static/index.html')
})

var io = require('socket.io').listen(app.listen(port))

io.set('authorization', function(handshakeData, accept) {
  handshakeData.cookie = Cookie.parse(handshakeData.headers.cookie)
  var connectSid = handshakeData.cookie['connect.sid']
  if (connectSid) {
      connectSid = cookieParser.signedCookie(connectSid, 'technode');
    sessionStore.get(connectSid, function(error, session) {
      if (error) {
        accept(error.message, false)
      } else {
        handshakeData.session = session
        if (session._userId) {
          accept(null, true)
        } else {
          accept('No login')
        }
      }
    })
  } else {
    accept('No session')
  }
});

var messages = [];

io.sockets.on('connection', function (socket) {
  socket.on('messages.read',function(){
    socket.emit('messages.read',messages);
  });
  socket.on('messages.create',function(message){
    messages.push(message);
    io.sockets.emit('messages.add',message);
  });
});

console.log('TechNode is on port ' + port + '!');

