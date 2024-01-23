'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const { ObjectId } = require('mongodb');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');

const app = express();

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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false);
      }
      return done(null, user);
    });
  }));

  // Be sure to change the title
  app
    .route('/')
    .get((req, res) => {
    // Change the response to render the Pug template
    res.render('index', {
      showRegistration: true,
      showLogin: true,
      title: 'Connected to Database',
      message: 'Please login'
    });
  });

  // Serialization and deserialization here...
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  app
    .route('/register')
    .post((req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          const hash = bcrypt.hashSync(req.body.password, 12);

          myDataBase.insertOne({
              username: req.body.username,
              password: hash
            },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
    },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

  app
    .route('/login')
    .post(passport.authenticate('local',{failureRedirect: '/', failureMessage: true}), (req, res) => {
    res.redirect('/profile');
  });

  app
    .route('/profile')
    .get(ensureAuthenticated, (req, res) => {
    res.render('profile', {
      username: req.user.username
    });
  });

  app
    .route('/logout')
    .get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.use((req, res, next) => {
    res.status(404)
    .type('text')
    .send('Not Found');
  });

  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

// app.listen out here...
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
