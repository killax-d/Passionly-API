function init(router, passport) {
	const auth = require('../services/auth'),
		{ asyncMiddleware } = require('../models/HttpError');

	router.post('/signup', asyncMiddleware(auth.signup));
	router.post('/login', asyncMiddleware(auth.login));
	router.post('/logout', passport.authenticate('jwt'), asyncMiddleware(auth.logout));
	router.post('/refresh', asyncMiddleware(auth.refreshToken));
}

module.exports = {
	init
}

