const JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt,
    config = require('./config'),
    userRepository = require('../app/repository/users');

module.exports = function(passport) {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.auth_config.secret,
  };
  passport.use('jwt', new JwtStrategy(opts, async function(jwt_payload, done) {
    var user = await userRepository.searchUser('id', jwt_payload.id);
    if (user) return done(null, user);
    return done(error, false);
  }));
};
