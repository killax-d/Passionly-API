const { client } = require('../db/client');
const userRepository = require('../repository/users');
const questionRepository = require('../repository/questions');
const { getLocale } = require('../locales/index');

// Retrieve avalaibles USERS
const getAvalaiblesFor = async (id) => {
	let date = new Date();
	date.setDate(date.getDate()-30); // 30 days of inactivity

	let user = await client.query("SELECT users.id AS user_id, birthdate, gender, fk_address, gender_desired FROM users JOIN subscription ON users.id = subscription.fk_userid WHERE users.id = $1 AND last_login::date >= $2::date;", [id, date]);
	user = user.rows[0];

	if (!user) return { success: false, message: `No subscription or inactivity for user : ${id}` }; // no subcription or inactivity

	let both_gender_desired = user.gender_desired;
	if (both_gender_desired === 2) {
		user.gender = 2;
		user.gender_desired = 0;
		both_gender_desired = 1;
	}

	// [(available AND survey_complete), current_userid, gender_desired, current_usergender]
	let users = await client.query('SELECT users.id AS user_id, birthdate, gender, available, survey_complete, fk_address, subscription.id AS sub_id, gender_desired, match_left FROM users JOIN subscription ON users.id = subscription.fk_userid WHERE available = $1 AND survey_complete = $1 AND NOT users.id = $2 AND users.gender IN ($3, $4) AND match_left > 0 AND gender_desired = $5 AND last_login::date >= $6::date AND users.id NOT IN (SELECT fk_userid_2 FROM already_match WHERE fk_userid_1 = $2) AND users.id NOT IN (SELECT fk_userid_1 FROM already_match WHERE fk_userid_2 = $2);', ['TRUE', id, user.gender_desired, both_gender_desired, user.gender, date])
	users = users.rows;

	if (users.length === 0) return { success: false, message: `No users available for user : ${id}` };

	// FILTER WITH CRITERIA
	// AGE
	let userAge = userRepository.getAge(user);
	let ageDesired = await questionRepository.getAnswerCriteriaFor(id, 'age');
	if (!ageDesired) return { success: false, message: `No user age range answer for user : ${id}` };

	users = users.filter(async (u) => {
		let age = userRepository.getAge(u);
		let ageDesired_partner = await questionRepository.getAnswerCriteriaFor(u.user_id, 'age');
		if (ageDesired.min <= age && age <= ageDesired.max && ageDesired_partner.min <= userAge && userAge <= ageDesired_partner.max) return u;
	});

	if (users.length === 0) return { success: false, message: `No users in age range for user : ${id}` };
	// END AGE

	// DISTANCE
	let distanceDesired = await questionRepository.getAnswerCriteriaFor(id, 'distance');
	if (!distanceDesired) return { success: false, message: `No user distance range answer for user : ${id}` };

	let city = await userRepository.getCity(user);

	users = users.filter(async (u) => {
		let other_city = await userRepository.getCity(u);
		if (userRepository.getDistance(city, other_city) <= distanceDesired.max) return u;
	});

	if (users.length === 0) return { success: false, message: `No users in distance range for user : ${id}` };
	// END DISTANCE
	
	return { success: true, user, users };
}

const getSurveyFor = async (id) => {
	let survey = await client.query('SELECT * FROM surveys JOIN questions ON surveys.fk_questionid = questions.id JOIN answers ON surveys.fk_answerid = answers.id LEFT JOIN question_answer_points ON answers.id = question_answer_points.fk_answerid WHERE fk_userid = $1 AND criteria IS NULL', [id]);
	if (!survey) return { success: false, message: `Survey response not found for user : ${id}`};

	return { success: true, survey: survey.rows };
}

const getCompatibility = async (survey, other) => {
	try {
		let RestrictiveNotMatch = { message: `Restrictive compatibility failed, user : ${other.fk_userid}` };
		let values = [survey, other];

		let score = 0;

		// Do restrictives first (4 per compatibility perfect match, 2 else, and if no/other -1 and throw)
		let restrictives = [values[0].filter((answer) => answer.type === 'restrictive'), values[1].filter((answer) => answer.type === 'restrictive')];
		restrictives[0].forEach((answer) => {
			let isNo = answer.answer_key.startsWith('survey.answer.no');
			let other_isNo = restrictives[1].some((a) => a.fk_questionid === answer.fk_questionid && a.answer_key.startsWith('survey.answer.no'));

			if ((isNo && !other_isNo) || (!isNo && other_isNo)) throw new Error('Restrictive Not match');
			if (restrictives[1].some((a) => a.fk_answerid === answer.fk_answerid)) return score += answer.score ? answer.score : 4;
			return score += answer.score ? answer.score : 2;
		});

		let others = [values[0].filter((answer) => answer.type !== 'restrictive'), values[1].filter((answer) => answer.type !== 'restrictive')];
		others[0].forEach((answer) => {
			if (others[1].some((a) => a.fk_answerid === answer.fk_answerid)) return score += answer.score ? answer.score : 1;
			return score;
		});

		return { success: true, id: other[0].fk_userid, score: score };
	} catch (ex) {
		return { success: false, message: ex.message };
	}
}

const getPartnersFor = async (id) => {
	let users = await getAvalaiblesFor(id);
	if (!users.success) return { success: false, message: `No users avalaibles for user : ${id} : ${users.message}` };
	let survey = await getSurveyFor(id);
	if (!survey.success) return { success: false, message: `No survey data for user : ${id} : ${survey.message}` };

	user = users.user;
	users = users.users;
	survey = survey.survey;
	let isMatching = [];

	let lock = false;

	await users.asyncForEach(async function (u) {
		if (lock) return 'break';

		let other = await getSurveyFor(u.user_id);
		if (!other.success) return;

		let compatibility = await getCompatibility(survey, other.survey);
		if (compatibility.success) isMatching.push(compatibility);
		if (compatibility.score >= optimal_score) lock = true;
	});

	if (isMatching.length === 0) return { success: false, message: `No match for user : ${user.user_id}` };
	return { success: true, users: isMatching };
}

const checkAll = async () => {
	let subs = await client.query('SELECT users.id as user_id FROM users JOIN subscription ON users.id = subscription.fk_userid WHERE survey_complete = $1 AND available = $1', ['TRUE']);
	subs = subs.rows;

	await subs.asyncForEach(async (sub) => {
		if (sub.lock) return;
		let partners = await getPartnersFor(sub.user_id);

		if (!partners.success) return console.log(`[MATCH][WARNING] No partner for ID : ${sub.user_id} : ${partners.message}`);

		partners.users.forEach((user) => console.log(`[MATCH][INFO] Partner found for user : ${sub.user_id}, ID : ${user.id}, score: ${user.score}`));
		let partner = partners.users.reduce((max, user) => max ? max.score < user.score ? max = user : max : user);
		
		let date = new Date();
		if (!dev) date.setDate(date.getDate() + (8 - date.getDay())); // Display user only the monday

		subs.filter((s) => s.user_id === partner.id)[0].lock = true; // lock the partner

		await client.query('INSERT INTO already_match (fk_userid_1, fk_userid_2) VALUES ($1, $2);', [sub.user_id, partner.id]);
		await client.query('INSERT INTO match (fk_userid_1, fk_userid_2, display_at) VALUES ($1, $2, $3::timestamp);', [sub.user_id, partner.id, date]);
		await client.query('UPDATE users SET available = $1 WHERE id = $2 OR id = $3', ['FALSE', sub.user_id, partner.id]);

		return console.log(`[MATCH][COMPLETE] Chosen partner for user : ${sub.user_id}, ID : ${partner.id} with score : ${partner.score}`);
	});
	return { success: true };
}

const notify = async (id, user_matched_id) => {
	let user = await userRepository.searchUser('id', id);
	let matched_user = await userRepository.searchUser('id', user_matched_id);
	if (!user) return { success: false, message: `Can't retrieve user data for id : ${id}` };

	try {
		if (!user.firebase_token) throw new Error(`No device token for user : ${id}`);
		let payload = {
			notification: {
				title: getLocale(user.language).notification.new_match.title,
				body: getLocale(user.language).notification.new_match.body.format(`${matched_user.firstname}`)
			}
		}
		console.log(`[NOTIFY][INFO] Sending : ${JSON.stringify(payload)} -> to user : ${id}`)

		let response = await firebase.messaging().sendToDevice(user.firebase_token, payload);
		if (response) return { success: true }
	} catch (ex) {
		return { success: false, message: `Unable to send message : ${ex.message}` }
	}
	return { success: false, message: `An unhandled error has occurred` }
}

const notifierTask = async () => {
	let matchs = await client.query('SELECT fk_userid_1, fk_userid_2 FROM match WHERE notified = $1 AND display_at >= $2', ['FALSE', new Date()]);
	if (!matchs) return { success: false, message: 'No match to notify' };

	matchs = matchs.rows;
	await matchs.asyncForEach(async (match) => {
		let notification1 = await notify(match.fk_userid_1, match.fk_userid_2);
		let notification2 = await notify(match.fk_userid_2, match.fk_userid_1);

		if (!notification1.success || !notification2.success) console.log(`[NOTIFY][ERROR] ${notification1.success ? 'User 1 is OK' : notification1.message} && ${notification2.success ? 'User 2 is OK' : notification2.message}`);
		client.query('UPDATE match SET user1_notified = $1, user2_notified = $2 WHERE fk_userid_1 = $3 AND fk_userid_2 = $4', [notification1.success, notification2.success, match.fk_userid_1, match.fk_userid_2]);
	})
	return { success: true }
}

module.exports = {}

setTimeout(async () => {
	let start = new Date().getTime();
	console.log('[SERVICES][MATCH] Match service started');
	let action = await checkAll();
	let end = new Date().getTime();
	let time = end - start;
	if (!action.success) console.log(action.message);
	console.log(`[SERVICES][MATCH] Match service ended in ${time} ms`);
	setTimeout(checkAll, 3 * 60 * 60 * 1000); // do it 3 hours after finishing current action
}, 5000); // start 5s after boot
setInterval(async () => {
	console.log('[SERVICES][NOTIFY] Notify service started');
	let action = await notifierTask();
	if (!action.success) console.log(action.message);
	console.log('[SERVICES][NOTIFY] Notify service ended');
}, 3 * 60 * 60 * 1000); // each 3 hours