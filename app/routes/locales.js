function init(router, passport) {
	const locales = require('../repository/locales'),
		{ asyncMiddleware } = require('../models/HttpError');

	router.get('/langs', asyncMiddleware(locales.getLangs));
	router.get('/countries', asyncMiddleware(locales.getCountries));
	router.get('/cities', asyncMiddleware(locales.getCities));
}

module.exports = {
	init
}

