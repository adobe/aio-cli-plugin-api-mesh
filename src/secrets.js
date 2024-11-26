// Parse the yaml secrets string from env to json object
function loadMeshSecrets(logger, secret) {
	let parsedSecrets = {};

	try {
		// Replace escaped backslashes with a single backslash
		secret = secret.replace(/\\"/g, '"');
		parsedSecrets = JSON.parse(secret);
	} catch (err) {
		logger.error('Error parsing secrets.');
	}

	return parsedSecrets;
}

// Custom get secrets handler
const getSecretsHandler = {
	get: function (target, prop, receiver) {
		if (prop === 'toJSON') {
			// Handle the toJSON case
			return () => target;
		}
		if (prop in target) {
			return Reflect.get(target, prop, receiver);
		} else {
			throw new Error(`The secret ${String(prop)} is not available.`);
		}
	},
	set: function () {
		throw new Error('Setting secrets is not allowed');
	},
};

module.exports = { loadMeshSecrets, getSecretsHandler };
