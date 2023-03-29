const fs = require('fs');
const { Flags } = require('@oclif/core');

/**
 * Returns the string representation of the object's path.
 * If the path evaluates to false, the default string is returned.
 *
 * @param {object} obj
 * @param {Array<string>} path
 * @param {string} defaultString
 * @returns {string}
 */
function objToString(obj, path = [], defaultString = '') {
	try {
		// Cache the current object
		let current = obj;

		// For each item in the path, dig into the object
		for (let i = 0; i < path.length; i++) {
			// If the item isn't found, return the default (or null)
			if (!current[path[i]]) return defaultString;

			// Otherwise, update the current  value
			current = current[path[i]];
		}

		if (typeof current === 'string') {
			return current;
		} else if (typeof current === 'object') {
			return JSON.stringify(current, null, 2);
		} else {
			return defaultString;
		}
	} catch (error) {
		return defaultString;
	}
}

function clearEnv() {
	for (const key in process.env) {
		delete process.env[key]
	}
}


function lintEnvFileContent(envContent) {

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
		const line=lines[index];
		const trimmedLine = line.trim();
		if (trimmedLine.startsWith('#') || trimmedLine === '') {
			// ignore comment or empty lines
			continue;
		}
		
		if(!trimmedLine.includes('=')){
			errors.push(`Invalid format << ${trimmedLine} >> on line ${index+1}`)
		}
		else{
			const [key, value] = trimmedLine.split('=', 2);
			if (!envKeyRegex.test(key) || !envValueRegex.test(value)) {
				// invalid format: key or value does not match regex
				errors.push(`Invalid format for key/value << ${trimmedLine} >> on line ${index+1}`);
			}
			if (key in envDict) {
				// duplicate key found
				errors.push(`Duplicate key << ${key} >> on line ${index+1}`);
			}
			envDict[key] = value;
		}
		
	}
	if(errors.length){
		return {
			valid: false,
			error: errors.toString()
		};
	}
	return {
		valid:true
	};
}

async function loadPupa() {
	try {
		const pupa = (await import('pupa')).default;
		return pupa;
	}
	catch {
		console.log("Error while loading pupa module")
	}
};

async function interpolateMesh(data,obj){
	let missingKeys=[];
	let interpolatedMesh;
	await loadPupa().then(pupa => {
		interpolatedMesh = pupa(data, obj, {
			ignoreMissing: true,
			transform: ({ value, key }) => {
				if (key.startsWith("env.")) {
					if (value) {
						return value;
					} else {
						// missing value, add to list
						missingKeys.push(key.split(".")[1]);
					}
				} else {
					//ignore
					return undefined;
				}
				return value;
			}
		});

	});

	if(missingKeys.length){
		return{
			interpolationStatus : 'failed',
			missingKeys: missingKeys,
			interpolatedMesh: ''
		}
	}
	return{
		interpolationStatus : 'success',
		missingKeys: [],
		interpolatedMesh: interpolatedMesh
	}
};

const ignoreCacheFlag = Flags.boolean({
	char: 'i',
	description: 'Ignore cache and force manual org -> project -> workspace selection',
	default: false
});

const autoConfirmActionFlag = Flags.boolean({
	char: 'c',
	description:
		'Auto confirm action prompt. CLI will not check for user approval before executing the action.',
	default: false,
});

const jsonFlag = Flags.boolean({
	description: 'Output JSON',
	default: false,
});

const envFileFlag = Flags.string({
	char: 'e',
	description: 'Path to env file'
})

module.exports = {
	objToString,
	clearEnv,
	lintEnvFileContent,
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	envFileFlag,
	interpolateMesh
};
