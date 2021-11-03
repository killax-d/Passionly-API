const { client } = require('../db/client');
const validation = require('./validation');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const sha1 = require('sha1');

// SIGNUP
const signup = async (request, response) => {
	const userRepository = require('../repository/users');
	var errors = await userRepository.validateUser(request.body);
	if (!errors) return userRepository.createUser(request, response);
	return response.status(409).json({ success: false, field: errors.fields, key: errors.key });
}

// LOGIN
const login = async (request, response) => {
	const userRepository = require('../repository/users');
	let login = request.body.login;
	let device = request.body.device;
	// Login with username or email
	let loginType = validation.isValidEmail(login)
		? 'email'
		: 'username';

	let user = await userRepository.searchUser(loginType, login);
	if (!user) throw new HttpError('Authentication failed. Unknow user.', 404);

	var isMatch = await userRepository.comparePassword(user, request.body.password)
	if (!isMatch) throw new HttpError('Authentication failed. Wrong password.');
	
	var access_token = generateJWTToken(user);
	let refresh_token = await generateRefreshToken(user, device);

	// remove sensible data before sending user data
	delete user.password;
	delete user.firebase_token;
	delete user.ban_date;
	delete user.ban_reason_key;
	user.address = await userRepository.getAddress(user);
	return response.status(200).json({ success: true, access_token, refresh_token, user: user });
}

// LOGOUT
const logout = async (request, response) => {
	return response.status(200).json({ success: true })
}

const refreshToken = async (request, response) => {
	const userRepository = require('../repository/users');
	let data = request.body;
	if (!data.access_token || !data.refresh_token) throw new HttpError('Unable to refresh token : No token provided', 500);
	if (!data.device) throw new HttpError('No device specified', 500)

	let token_data = jwt.decode(data.access_token);
	if (!token_data) throw new HttpError('Invalid access token', 500);

	let user = await userRepository.searchUser('id', token_data.id);
	if (!user) throw new HttpError('Unknown user', 500);

	let query = await client.query('SELECT * FROM users_tokens WHERE refresh_token = $1 AND device_uuid = $2;', [data.refresh_token, data.device]);
	let user_refresh_token = query.rows[0];
	if (!user_refresh_token) throw new HttpError(`Invalid refresh token for user : ${user.id}`, 500);

	let refresh_token = await generateRefreshToken(user, data.device);
	var access_token = generateJWTToken(user);

	return response.status(200).json({ success: true, access_token, refresh_token });
}

const generateJWTToken = (user) => {
	var token = jwt.sign(JSON.parse(JSON.stringify({ id: user.id, username: user.username })), config.auth_config.secret, { expiresIn: '1h' });
	jwt.verify(token, config.auth_config.secret, (err, data) => err ? console.log(err, data) : null);

	return token;
}

const generateRefreshToken = async (user, device) => {
	let expiration = new Date(); 
	expiration.setDate(expiration.getDate() + 90);
	expiration = expiration.toISOString();

	let token = sha1(`${Math.random(1000000)}${user.email}${new Date()}`)

	let query = await client.query('SELECT * FROM users_tokens WHERE fk_userid = $1 AND device_uuid = $2 LIMIT 1;', [user.id, device]);
	if (!query.rows[0]) await client.query('INSERT INTO users_tokens (refresh_token, expiration, fk_userid, device_uuid) VALUES ($1, $2::timestamp, $3, $4);', [token, expiration, user.id, device]);
	else await client.query('UPDATE users_tokens SET refresh_token = $1, expiration = $2::timestamp WHERE fk_userid = $3 AND device_uuid = $4', [token, expiration, user.id, device]);

	return token;
}

module.exports = {
  signup,
  login,
  logout,
  refreshToken
}