const { db_config } = require('../../config/config');

const { Pool } = require('pg');
const client = new Pool(db_config);

module.exports = {
	client
}