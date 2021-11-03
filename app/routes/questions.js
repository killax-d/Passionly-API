function init(router, passport) {
	const question = require('../repository/questions'),
		{ asyncMiddleware } = require('../models/HttpError');

	router.get('/survey/state', passport.authenticate('jwt', { session: false }), asyncMiddleware(question.getSurveyState));
	router.get('/questions', passport.authenticate('jwt', { session: false }), asyncMiddleware(question.getAll));
	router.post('/questions/answer', passport.authenticate('jwt', { session: false }), asyncMiddleware(question.updateAnswer));
}

module.exports = {
	init
}

