/**
 *clears the process.env object
 */

function clearEnv() {
	for (const key in process.env) {
		delete process.env[key];
	}
}

/**
 *validates the environment file content
 * @param {envContent}
 * @returns {object} containing the status of validation . If validation is failed then the error property including the formatting errors is returned.
 */

function validateEnvFileFormat(envContent) {
	//Key should start with a underscore or an alphabet followed by underscore/alphanumeric characters
	const envKeyRegex = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

	const envValueRegex = /^(?:"(?:\\.|[^\\"])*"|'(?:\\.|[^\\'])*'|[^'"\s])+$/;

	/*
	The above regex matches one or more of below :
	(?:"(?:\\.|[^\\"])*"|'(?:\\.|[^\\'])*'|[^'"\s])
	which is 
	1. ?:"(?:\\.|[^\\"])*" : Non capturing group starts and ends with '"'
	*/
	const envDict = {};
	const lines = envContent.split(/\r?\n/);
	const errors = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const trimmedLine = line.trim();
		if (trimmedLine.startsWith('#') || trimmedLine === '') {
			// ignore comment or empty lines
			continue;
		}

		if (!trimmedLine.includes('=')) {
			errors.push(`Invalid format << ${trimmedLine} >> on line ${index + 1}`);
		} else {
			const [key, value] = trimmedLine.split('=', 2);
			if (!envKeyRegex.test(key) || !envValueRegex.test(value)) {
				// invalid format: key or value does not match regex
				errors.push(`Invalid format for key/value << ${trimmedLine} >> on line ${index + 1}`);
			}
			if (key in envDict) {
				// duplicate key found
				errors.push(`Duplicate key << ${key} >> on line ${index + 1}`);
			}
			envDict[key] = value;
		}
	}
	if (errors.length) {
		return {
			valid: false,
			error: errors.toString(),
		};
	}
	return {
		valid: true,
	};
}

/**
 *loads the pupa module dynamically and then interpolates the raw data from mesh file with object data
 * @param {data}
 * @param {obj}
 * @returns {object} having interpolationStatus, missingKeys and interpolatedMesh
 */

async function interpolateMesh(data, obj) {
	let missingKeys = [];
	let interpolatedMesh;
	let pupa;
	try {
		pupa = (await import('pupa')).default;
	} catch {
		this.error('Error while loading pupa module');
	}

	interpolatedMesh = pupa(data, obj, {
		ignoreMissing: true,
		transform: ({ value, key }) => {
			if (key.startsWith('env.')) {
				if (value) {
					return value;
				} else {
					// missing value, add to list
					missingKeys.push(key.split('.')[1]);
				}
			} else {
				//ignore
				return undefined;
			}
			return value;
		},
	});

	if (missingKeys.length) {
		return {
			interpolationStatus: 'failed',
			missingKeys: missingKeys,
			interpolatedMesh: '',
		};
	}
	return {
		interpolationStatus: 'success',
		missingKeys: [],
		interpolatedMeshData: interpolatedMesh,
	};
}

module.exports = {
	interpolateMesh,
	clearEnv,
	validateEnvFileFormat,
};
