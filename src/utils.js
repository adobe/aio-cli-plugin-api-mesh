const fs = require('fs');
const path = require('path');
const { Flags } = require('@oclif/core');
const { readFile } = require('fs/promises');
const { interpolateMesh } = require('./helpers');
const dotenv = require('dotenv');

/**
 * @returns returns the root directory of the project
 */
function getAppRootDir() {
	let currentDir = __dirname;
	while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
		currentDir = path.join(currentDir, '..');
	}
	return currentDir;
}

const ignoreCacheFlag = Flags.boolean({
	char: 'i',
	description: 'Ignore cache and force manual org -> project -> workspace selection',
	default: false,
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
	description: 'Path to env file',
	default: '.env',
});

/**
 * Check if there are any placeholders in the input mesh file
 * The below regular expressions are part of pupa string interpolation
 * doubleBraceRegex = /{{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}}/gi
 * braceRegex = /{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}/gi
 * The above regex has been enhanced to include prefix '.env'
 * @param {string} mesh
 * @returns {boolean}
 */

function checkPlaceholders(mesh) {
	const doubleBraceRegex = /{{env\.(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}}/gi;
	const braceRegex = /{env\.(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}/gi;
	const foundDoubleBraceRegex = mesh.match(doubleBraceRegex);
	const foundSingleBraceRegex = mesh.match(braceRegex);

	if (
		typeof foundDoubleBraceRegex === 'object' &&
		foundDoubleBraceRegex === null &&
		typeof foundSingleBraceRegex === 'object' &&
		foundSingleBraceRegex === null
	) {
		return false;
	}
	return true;
}

/**
 * Read the file contents. If there is any error, report it to the user.
 * @param {string} file
 * @param {object} command
 * @param {string} filetype
 * @returns {string}
 */

async function readFileContents(file, command, filetype) {
	try {
		return await readFile(file, 'utf8');
	} catch (error) {
		command.log(error.message);
		if (filetype === 'mesh') {
			command.error(
				`Unable to read the mesh configuration file provided. Please check the file and try again.`,
			);
		}
		command.error(`Unable to read the file ${file}. Please check the file and try again.`);
	}
}

/**
 *validates the environment file content
 * @param {string} envContent
 * @returns {object} containing the status of validation
 * If validation is failed then the error property including the formatting errors is returned.
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
 * Read the environment file, checks for validation status and interpolate mesh
 * @param {string} inputMeshData
 * @param {string} envFilePath
 * @param {object} command
 * @returns {string}
 */

async function validateAndInterpolateMesh(inputMeshData, envFilePath, command) {
	//Read the environment file
	const envFileContent = await readFileContents(envFilePath, command, 'env');

	//Validate the environment file
	const envFileValidity = validateEnvFileFormat(envFileContent);
	if (envFileValidity.valid) {
		//load env file using dotenv and add 'env' as the root property in the object
		const envObj = { env: dotenv.config({ path: envFilePath }).parsed };
		const { interpolationStatus, missingKeys, interpolatedMeshData } = await interpolateMesh(
			inputMeshData,
			envObj,
		);

		if (interpolationStatus == 'failed') {
			command.error(
				'The mesh file cannot be interpolated due to missing keys : ' + missingKeys.join(' , '),
			);
		}

		try {
			return JSON.parse(interpolatedMeshData);
		} catch (err) {
			command.log(err.message);
			command.log(interpolatedMeshData);
			command.error('Interpolated mesh is not a valid JSON. Please check the generated json file.');
		}
	} else {
		command.error(`Issue in ${envFilePath} file - ` + envFileValidity.error);
	}
}

module.exports = {
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	envFileFlag,
	checkPlaceholders,
	readFileContents,
	validateEnvFileFormat,
	validateAndInterpolateMesh,
	getAppRootDir,
};
