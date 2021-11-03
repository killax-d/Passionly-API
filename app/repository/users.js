const { client } = require('../db/client');
const bcrypt = require('bcrypt-nodejs');
const auth = require('../services/auth');
const cities = require('all-the-cities');

// GET ALL
const getUsers = async (request, response) => {
	var results = await client.query('SELECT * FROM Users ORDER BY id ASC');
	return response.status(200).json({success: true, users: results.rows});
}

// GET USER FROM TOKEN
const getUser = async (request, response) => {
	let user = request.user;
	delete user.password;
	delete user.firebase_token;
	delete user.ban_date;
	delete user.ban_reason_key;
	user.address = await getAddress(user);
	return response.status(200).json({success: true, user});
}

// GET BY ID
const getUserById = async (request, response) => {
	var result = await client.query('SELECT * FROM Users WHERE id = $1 LIMIT 1', [parseInt(request.params.id)]);
	return response.status(200).json({success: true, user: result.rows[0]});
}

// POST
const createUser = async (request, response) => {
	let { username, password, firstname, lastname, email, phone, birthdate, gender, address, language } = request.body
	password = bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);

	let address_values = [address.street_nr, address.street, address.city, address.country];
	var result = await client.query('INSERT INTO addresses (street_nr, street, city, fk_country) VALUES ($1, $2, $3, $4) RETURNING id', address_values);
	var id = result.rows[0].id;
	try {
		let user_values = [username, password, firstname, lastname, email, phone, birthdate, gender, id, language, new Date()];
		await client.query('INSERT INTO users (username, password, firstname, lastname, email, phone, birthdate, gender, fk_address, language, last_login) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', user_values);
	} catch (ex) {
		await client.query('DELETE FROM addresses WHERE id = $1', (id));
		throw new HttpError(409, 'No valid values for user');
	}
	
	return response.status(200).json({success: true});	
}

// PUT
const updateUser = async (request, response) => {
	const id = parseInt(request.params.id);
	const { name, email } = request.body;

	await client.query('UPDATE Users SET name = $1, email = $2 WHERE id = $3', [name, email, id]);
	return response.status(200).send({success: true, msg: `User modified with ID: ${id}`});
}

// DELETE
const deleteUser = async (request, response) => {
	const id = parseInt(request.params.id)

	await client.query('DELETE FROM Users WHERE id = $1', [id]);
	return response.status(200).send({success: true, msg: `User deleted with ID: ${id}`});
}

// SEARCH
const searchUser = async (field, value, callback) => {
	var result = await client.query(`SELECT * FROM Users WHERE ${field} = $1 LIMIT 1`, [value]);
	return result.rows[0];
}

// VALIDATION
const validateUser = async (user) => {
	const errors = {
		fields: [],
		key: 'form.validation.taken'
	}
	var username = await searchUser('username', user.username);
	var email = await searchUser('email', user.email);
	var phone = await searchUser('phone', user.phone);
	var city = cities.filter((city) => city.name.match(user.address.city));

	if (username) errors.fields.push('username');
	if (email) errors.fields.push('email');
	if (phone) errors.fields.push('phone');
	if (!city[0]) errors.fields.push('city');

	return errors.fields.length === 0 ? undefined : errors;
}

// PASSWORD CHECK
const comparePassword = (user, passw) => {
	return new Promise(function(resolve, reject) {
		bcrypt.compare(passw, user.password, function (error, isMatch) {
			if (error) { console.log(error); return reject('Authentication failed.') }
			resolve(isMatch);
		});
	});
};

// GET AGE
const getAge = (user) => {
	if (!user) throw new HttpError('User is undefined', 404);
	if (!user.birthdate) throw new HttpError(`Birthdate of User : ${user.id} is undefined`, 404);

	let now = new Date();
	let born = new Date(user.birthdate);
	var birthday = new Date(now.getFullYear(), born.getMonth(), born.getDate());

	if (now >= birthday) return now.getFullYear() - born.getFullYear();
	else return now.getFullYear() - born.getFullYear() - 1;
}

// UTILS
const degreesToRadians = (degrees) => {
	var pi = Math.PI;
	return degrees * (pi/180);
}

// GET ADDRESS / CITY / DISTANCE
const getAddress = async (user) => {
	let results = await client.query('SELECT * FROM addresses WHERE id = $1', [user.fk_address]);
	if (results && results.rows[0]) return results.rows[0];
}

const getCity = async (user) => {
	let user_address = await getAddress(user);
	if (!user_address) throw new HttpError(`No user address for : ${user.id}`, 404);

	let user_country = await client.query('SELECT * FROM countries WHERE id = $1', [user_address.fk_country]);
	user_country = user_country.rows[0];

	let city = cities.filter((city) => city.name === user_address.city && city.country === user_country.iso);
	if (!city[0]) throw new HttpError(`City not found : ${ user_address.city }`);

	return city[0];
}

const getDistance = async (city, other_city) => {
	lon1 = city.loc.coordinates[1];
	lon2 = other_city.loc.coordinates[1];
	lat1 = city.loc.coordinates[0];
	lat2 = other_city.loc.coordinates[0];

	var R = 6371e3; // metres
	var phi_1 = degreesToRadians(lat1);
	var phi_2 = degreesToRadians(lat2);
	var delta_phi = degreesToRadians(lat2-lat1);
	var delta_lambda = degreesToRadians(lon2-lon1);

	var a = Math.sin(delta_phi/2) * Math.sin(delta_phi/2) +
	        Math.cos(phi_1) * Math.cos(phi_2) *
	        Math.sin(delta_lambda/2) * Math.sin(delta_lambda/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	var d = (R * c)/1000;

	return d;
}

module.exports = {
	getUsers,
	getUser,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	searchUser,
	validateUser,
	comparePassword,
	getAge,
	getAddress,
	getCity,
	getDistance
}