'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const myDB = require('./connection');
const routes = require('./routes.js');
const auth = require('./auth');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize({}));
app.use(passport.session({}));

app.set('view engine', 'pug');
app.set('views', './views/pug');

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  auth(app, myDataBase);
  routes(app, myDataBase);
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

let currentUsers = 0;
io.on('connection', socket => {
  console.log('A user has connected');

  ++currentUsers;

  io.emit('user count', currentUsers);
});
