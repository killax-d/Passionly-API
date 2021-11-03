class HttpError extends Error {
	constructor (message, httpCode = 500) {
		super(message);
		this.status = httpCode;
	}
}

const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    next(err);
  });
};

const errorHandler = (err, req, res, next) => {
  if (typeof(err.message) !== 'string' && typeof(err.message) !== 'boolean' && typeof(err.message) !== 'int') err.message = JSON.stringify(err.message);
  console.log(err);
  return res.status(err.status || 500).send({success: false, msg: err.message});
}

module.exports = {
	HttpError,
	asyncMiddleware,
	errorHandler
}