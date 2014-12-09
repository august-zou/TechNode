var express = require('express');
var path = require('path');
var async = require('async');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var Controllers = require('./controllers');
var Cookie = require('cookie');
var app = express();
var MongoStore = require('connect-mongo')(session);


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
      console.log("login: "+user);
      if (err) {
        res.json(500, {msg: err})
      } else  {
        req.session._userId = user._id
        console.log(req.session._userId);
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
io.use(function(socket, next) {
  try {
    var data =  socket.request;
    if (! data.headers.cookie) {
        return next(new Error('Missing cookie headers'));
    }
    var cookie = Cookie.parse(data.headers.cookie);
    var sid = cookie['connect.sid'];
    if (! sid) {
        return next(new Error('Cookie signature is not valid'));
    }
    sid = cookieParser.signedCookie(sid,'technode');
    sessionStore.get(sid, function(err, session) {
        if (err) return next(err);
        if (! session) return next(new Error('session not found'));
        data.session = session;
        next();
    });
  } catch (err) {
    console.error(err.stack);
    next(new Error('Internal server error'));
  }
});
var messages = [];
var SYSTEM = {
  name: 'technode机器人',
  avatarUrl: 'http://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Robot_icon.svg/220px-Robot_icon.svg.png'
}


io.sockets.on('connection', function (socket) {
  console.log("handshake: "+socket.request.session._userId);
  _userId = socket.request.session._userId;
  Controllers.User.online(_userId, function(err, user) {
    if (err) {
      socket.emit('err', {
        mesg: err
      })
    } else {
      socket.broadcast.emit('online', user)
      socket.broadcast.emit('messageAdded', {
        content: user.name + '进入了聊天室',
        creator: SYSTEM,
        createAt: new Date()
      })
    }
  });
  socket.on('messages.read',function(){
    socket.emit('messages.read',messages);
  });
  socket.on('messages.create',function(message){
    messages.push(message);
    io.sockets.emit('messages.add',message);
  });
 
  socket.on("technode.read",function(){
    async.parallel([
      function(done){
        Controllers.User.getOnlineUsers(done);
      },
      function(done){
        Controllers.Message.read(done);
      }
      ],
      function(err,results){
        if(err){
          socket.emit('err', {
            msg: err
          })
        } else {
          socket.emit('technode.read',{
          users:results[0],
          messages:results[1]
          })
        }
      });
  }); 

  socket.on('messages.create',function(message){
    console.log("messages.create", message)
    Controllers.Message.create(message,function(err,message){
      if(err){
        socket.emit('err',{msg:err});
      } else {
        io.sockets.emit('messages.add',message);
      }
    });
  });

  socket.on('disconnect', function() {
    Controllers.User.offline(_userId, function(err, user) {
      if (err) {
        socket.emit('err', {
          mesg: err
        })
      } else {
        socket.broadcast.emit('offline', user)
        socket.broadcast.emit('messageAdded', {
          content: user.name + '离开了聊天室',
          creator: SYSTEM,
          createAt: new Date()
        })
      }
    })
  });
});

console.log('TechNode is on port ' + port + '!');

