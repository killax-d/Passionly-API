const express = require('express');
const config = require('../../config/config');
const router = express.Router();
const passport  = require('passport');
require('../../config/passport')(passport)

require('./users').init(router, passport);
require('./auth').init(router, passport);
require('./questions').init(router, passport);
require('./match').init(router, passport);
require('./partner').init(router, passport);
require('./locales').init(router, passport);

router.get('/', (request, response) => {
	response.json({ info: 'Node.js, Express, and Postgres API' })
})

module.exports = router;