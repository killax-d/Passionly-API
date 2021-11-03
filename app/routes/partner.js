function init(router, passport) {
	const partner = require('../repository/partner'),
		{ asyncMiddleware } = require('../models/HttpError');

	router.get('/partners', passport.authenticate('jwt', { session: false }), asyncMiddleware(partner.getAll));
}

module.exports = {
	init
}

