const locales = {
	default: require('./en.js'),
	'fr': { messages: require('./fr.js'), label: 'Français' },
	'en': { messages: require('./en.js'), label: 'English' }
}

const getLocale = (locale) => {
	locale = locale.toLowerCase();
	return locales[locale]
		? locales[locale].messages
		: locales.default.messages;
}

const availables = () => {
	let keys = Object.keys(locales);
	keys = keys.filter((key) => key !== 'default');
	keys = keys.map((key) => key = {value: key, label: locales[key].label});
	return keys;
}

module.exports = { 
	getLocale,
	availables
}