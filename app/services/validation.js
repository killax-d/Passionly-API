const Schema = require('validate');

const emailSchema = new Schema({
  email: {
    type: String,
    match: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    required: true,
  }
});

const isValidEmail = (email) => {
  return emailSchema.validate({email : email}).length == 0;
}

module.exports = {
  isValidEmail
}