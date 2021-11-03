function init(router, passport) {
	const match = require('../repository/match'),
		{ asyncMiddleware } = require('../models/HttpError');

	router.get('/subscription', passport.authenticate('jwt', { session: false }), asyncMiddleware(match.getSubscription));
	router.post('/subscription', passport.authenticate('jwt', { session: false }), asyncMiddleware(match.applySubscription));
	router.get('/match', passport.authenticate('jwt', { session: false }), asyncMiddleware(match.getMatch));
	router.post('/meeting', passport.authenticate('jwt', { session: false }), asyncMiddleware(match.addMeeting));
	router.post('/meeting/accept', passport.authenticate('jwt', { session: false }), asyncMiddleware(match.addMeetingResponse));
}

module.exports = {
	init
}

