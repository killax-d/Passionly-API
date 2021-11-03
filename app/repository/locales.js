const { client } = require('../db/client');
const { availables } = require('../locales/index');
const cities = require('all-the-cities');

// GET LOCALES
const getLangs = async (request, response) => {
	return response.status(200).json({ success: true, langs: availables() });
}

// GET COUNTRIES
const getCountries = async (request, response) => {
	let countries = await client.query('SELECT * FROM countries');
	if (!countries || !countries.rows[0]) throw new HttpError('No country found', 404);

	countries = countries.rows;
	countries.forEach((country) => country.label = country.country_name);
	
	return response.status(200).json({ success: true, countries });
}

// GET CITIES
const getCities = async (request, response) => {
	let country = request.query.country;
	if (!country) throw new HttpError('No country provided');

	let country_cities = cities.filter((city) => city.country === country);
	
	return response.status(200).json({ success: true, cities: country_cities });
}

module.exports = {
	getLangs,
	getCountries,
	getCities
}