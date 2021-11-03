const { client } = require('../db/client');
const userRepository = require('./users');
const cities = require('all-the-cities');

// GET PARTNER
const getPartner = async (id) => {
	let partner = await client.query('SELECT * FROM partner WHERE id = $1 LIMIT 1', [id]);
	if (!partner || !partner.rows[0]) throw new HttpError('Unknown partner', 404);

	return partner.rows[0];
}


// GET ADDRESS / CITY
const getAddress = async (partner) => {
	let results = await client.query('SELECT * FROM addresses WHERE id = $1', [partner.fk_address]);
	if (results && results.rows[0]) return results.rows[0];
}

const getCity = async (partner) => {
	let partner_address = await getAddress(partner);
	if (!partner_address) throw new HttpError(`No partner address for : ${partner.id}`, 404);

	let partner_country = await client.query('SELECT * FROM countries WHERE id = $1', [partner_address.fk_country]);
	partner_country = partner_country.rows[0];

	let city = cities.filter((city) => city.name === partner_address.city && city.country === partner_country.iso);
	if (!city[0]) throw new HttpError(`City not found : ${ partner_address.city }`);

	return city[0];
}

// GET ALL (by distance)
const getAll = async (request, response) => {
	let user = request.user;
	let body = request.body;

	let maxDistance = body.max;

	let partners = await client.query('SELECT * FROM partner');
	if (!partners) throw new HttpError('Unable to retrieve all partners');
	partners = partners.rows;

	let city = await userRepository.getCity(user);

	await partners.asyncForEach(async (partner) => {
		let other_city = await getCity(partner);
		partner.address = await getAddress(partner);
		partner.distance = 0;
		delete partner.fk_address;
		if (other_city) partner.distance = await userRepository.getDistance(city, other_city);
	});

	partners = partners.sort((partner, other_partner) => partner.distance - other_partner.distance);

	return response.status(200).json({ success: true, partners });
}

module.exports = {
	getPartner,
	getAll
}