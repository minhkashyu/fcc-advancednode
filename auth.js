const passport = require('passport');
const LocalStrategy = require('passport-local');
const GithubStrategy = require('passport-github');
const bcrypt = require('bcrypt');
const {ObjectId} = require('mongodb');

module.exports = function (app, myDataBase) {
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({username: username}, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false);
      }
      return done(null, user);
    });
  }));

  passport.use(new GithubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
  }, (accessToken, refreshToken, profile, done) => {
    console.log(profile);
    //Database logic here with callback containing your user object
  }));

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({_id: new ObjectId(id)}, (err, doc) => {
      done(null, doc);
    });
  });
};