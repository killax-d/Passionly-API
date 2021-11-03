const { client } = require('../db/client');
const partnerRepository = require('./partner');
const userRepository = require('./users');
const cities = require('all-the-cities');

// GET MATCH (with token)
const getMatch = async (request, response) => {
	let user = request.user;

	let match = await getMatchForUser(user);
	let meetings;
	let meeting;
	let partner;
	if (match) {
		let partner_id = match.fk_userid_1 === user.id ? match.fk_userid_2 : match.fk_userid_1;
		partner = await client.query('SELECT id, firstname, gender FROM users WHERE id = $1 LIMIT 1', [partner_id]);
		partner = partner.rows[0];

		meetings = await client.query('SELECT * FROM meeting WHERE fk_match = $1', [match.id]);
		meetings = meetings.rows;

		meeting = meetings.filter((meet) => meet.user1_accepted && meet.user2_accepted)[0];
		if (meeting) {
			meeting.partner = await partnerRepository.getPartner(meeting.fk_partner);
		}

		let city = await userRepository.getCity(user);

		await meetings.asyncForEach(async (meet) => meet.address = await getPartnerAddress(meet.fk_partner));
		await meetings.asyncForEach(async (meet) => {
			let other_city = await client.query('SELECT * FROM addresses WHERE id = $1', [meet.address.id]);
			other_city = await getCity(other_city.rows[0]);
			meet.distance = await userRepository.getDistance(city, other_city);
		});
	}

	let subscriptions = await client.query('SELECT * FROM subscription WHERE fk_userid = $1', [request.user.id]);
	let subscribed = subscriptions.rows && subscriptions.rows.length > 0;

	return response.status(200).json({ success: true, subscribed, partner, meetings, meeting });
}

// GET CITY
const getCity = async (address) => {
	let country = await client.query('SELECT * FROM countries WHERE id = $1', [address.fk_country]);
	if (!country || !country.rows[0]) throw new HttpError(`No country found for id : ${address.fk_country}`, 404)
	country = country.rows[0];

	let city = cities.filter((city) => city.name === address.city && city.country === country.iso);
	if (!city[0]) throw new HttpError(`City not found : ${ address.city }`);

	return city[0];
}

// GET MEETINGS
const getMeetings = async (match) => {
	let results = await client.query('SELECT * FROM meeting WHERE fk_match = $1', [match.id]);
	if (results && results.rows) return results.rows;
}

// ADD MEETING
const addMeeting = async (request, response) => {
	let user = request.user;
	let body = request.body;

	let date = new Date(body.date);
	if (!date || isNaN(date.getTime()) || date <= new Date()) throw new HttpError('Incorrect date', 500);

	let match = await getMatchForUser(user);
	if (!match) throw new HttpError('Match not found', 404);

	let matched_at = new Date(match.display_at);
	let day = date.getDay();
	if (day < 4 || day > 5) throw new HttpError('Incorrect day', 500);

	let hour = date.getHours();
	if (hour < 19 || hour > 21) throw new HttpError('Incorrect hour', 500);

	let meetings = await getMeetings(match);
	if (!meetings) throw new HttpError('Meeting not found', 404);
	meetings = meetings.filter((meet) => meet.requested_by === user.id);
	if (meetings.length >= 3) throw new HttpError('Maximum meeting exceeded for this match and user', 500);

	let partner = await partnerRepository.getPartner(body.partner);
	if (!partner) throw new HttpError('Partner not found', 404);

	let values = [match.id, user.id, partner.id, body.date, match.fk_userid_1 === user.id ? 'TRUE' : null, match.fk_userid_2 === user.id ? 'TRUE' : null];
	let meeting = await client.query('INSERT INTO meeting (fk_match, requested_by, fk_partner, planned_at, user1_accepted, user2_accepted) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;', values);

	let city = await userRepository.getCity(user);

	meeting = meeting.rows[0];
	meeting.address = await getPartnerAddress(partner.id);

	let other_city = await client.query('SELECT * FROM addresses WHERE id = $1', [partner.fk_address]);
	other_city = await getCity(other_city.rows[0]);
	meeting.distance = await userRepository.getDistance(city, other_city);

	return response.status(200).json({ success: true, meeting: meeting });
}


// ADD MEETING USER RESPONSE
const addMeetingResponse = async (request, response) => {
	let user = request.user;
	let body = request.body;

	let accepted = body.accept;
	let meeting = Number(body.meeting);
	if (typeof accepted !== 'boolean') throw new HttpError('Accept must be boolean value', 500);
	if (typeof meeting !== 'number') throw new HttpError('Meeting must be number value', 500);

	let match = await getMatchForUser(user);
	if (!match) throw new HttpError('Match not found', 404);

	let meetings = await getMeetings(match);
	if (!meetings || meetings.length === 0) throw new HttpError('Meeting not found', 404);

	meeting = meetings.filter((meet) => meet.id == meeting);
	if (!meeting[0]) throw new HttpError('Meeting not found', 404);
	meeting = meeting[0];

	if (meeting.requested_by === user.id && !accepted) {
		await client.query('DELETE FROM meeting WHERE id = $1', [meeting.id]);
		return response.status(200).json({ success: true, deleted: true, message: 'Deleted' });
	}
	
	await client.query(`UPDATE meeting SET ${match.fk_userid_1 === user.id ? 'user1_accepted' : 'user2_accepted'} = $2 WHERE id = $1`, [meeting.id, accepted]);
	
	meeting = await client.query('SELECT * FROM meeting WHERE id = $1', [meeting.id]);
	meeting = meeting.rows[0];
	if (meeting.user1_accepted && meeting.user2_accepted) return response.status(200).json({ success: true, meeting });
	return response.status(200).json({ success: true });
}


// GET MATCH FOR USER
const getMatchForUser = async (user) => {
	let results = await client.query('SELECT * FROM match WHERE (fk_userid_1 = $1 OR fk_userid_2 = $1) AND display_at <= $2 AND active = $3 LIMIT 1 ', [user.id, new Date(), 'TRUE']);
	if (!results || !results.rows[0]) return;
	return results.rows[0];
}

// GET SUBSCRIPTION
const getSubscription = async (request, response) => {
	let subscriptions = await client.query('SELECT gender_desired AS gender, match_left AS left FROM subscription WHERE fk_userid = $1', [request.user.id]);
	subscriptions = subscriptions.rows;
	if (!subscriptions[0]) return response.status(200).json({ success: true });
	return response.status(200).json({ success: true, subscriptions });
}

// APPLY SUBSCRIPTION
const applySubscription = async (request, response) => {
	let offer_id = request.body.offer;
	if (!offer_id) throw new HttpError('Please specify subscription id');
	let gender = request.body.gender;
	gender = gender ? gender : 2; // BOTH by default for demo

	let subscriptions = [{ id: 1, value: 1 }, { id: 2, value: 3}, { id: 3, value: 5 }];
	let subscription = subscriptions.filter((sub) => sub.id === offer_id)[0];
	if (!subscription) throw new HttpError('Incorrect subscription id');
	
	await client.query('INSERT INTO subscription (fk_userid, gender_desired, match_left) VALUES ($1, $2, $3)', [request.user.id, gender, subscription.value]);
	return response.status(200).json({ success: true });
}

// GET PARTNER ADDRESS
const getPartnerAddress = async (id) => {
	let partner = await client.query('SELECT * FROM partner WHERE id = $1', [id]);
	if (!partner || !partner.rows[0]) throw new HttpError('Unknown partner');
	partner = partner.rows[0];

	let address = await client.query('SELECT * FROM addresses WHERE id = $1', [partner.fk_address]);
	if (!address || !address.rows[0]) throw new HttpError('Unknown address');
	address = address.rows[0];

	return address;
}

module.exports = {
	getMatch,
	addMeeting,
	addMeetingResponse,
	getSubscription,
	applySubscription
}