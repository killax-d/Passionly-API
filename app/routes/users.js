function init(router, passport) {
	const user = require('../repository/users'),
		{ asyncMiddleware } = require('../models/HttpError');

	router.get('/user', passport.authenticate('jwt', { session: false }), asyncMiddleware(user.getUser));
	router.get('/users', passport.authenticate('jwt', { session: false }), asyncMiddleware(user.getUsers));
	router.get('/users/:id', passport.authenticate('jwt', { session: false }), asyncMiddleware(user.getUserById));
	//router.post('/users', passport.authenticate('jwt'), user.createUser);
	router.put('/users/:id', passport.authenticate('jwt', { session: false }), asyncMiddleware(user.updateUser));
	//router.delete('/users/:id', passport.authenticate('jwt'), user.deleteUser);
}

module.exports = {
	init
}

