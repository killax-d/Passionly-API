const db_config = {
  user: 'passionly',
  host: 'localhost',
  database: 'api',
  password: 'password',
  port: 5432
}

const app_config = {
  http_port: 3000,
  https_port: 8443
}

const auth_config = {
	secret: "itsasecret"
}

module.exports = {
	db_config,
	app_config,
	auth_config
}