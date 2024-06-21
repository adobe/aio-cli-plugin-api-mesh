const fs = require('fs');
const path = require('path');
const logger = require('../src/classes/logger');
const { Flags } = require('@oclif/core');
const { readFile } = require('fs/promises');
const { interpolateMesh } = require('./helpers');
const dotenv = require('dotenv');
const YAML = require('yaml');
const parseEnv = require('envsub/js/envsub-parser');
const os = require('os');
const chalk = require('chalk');
const crypto = require('crypto');

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

const secretsFlag = Flags.string({
	char: 's',
	description: 'Path to secrets file',
	default: false,
});

const portNoFlag = Flags.integer({
	char: 'p',
	description: 'Port number for the local dev server',
});

const debugFlag = Flags.boolean({
	description: 'Enable debugging mode',
	default: false,
});

const selectFlag = Flags.boolean({
	description: 'Retrieve existing artifacts from the mesh',
	default: false,
});

/**
 * Parse the meshConfig and get the list of (local) files to be imported
 *
 * @param data MeshConfig
 * @param meshConfigName MeshConfig
 * @returns files[] files present in meshConfig
 */
function getFilesInMeshConfig(data, meshConfigName) {
	//ignore if the file names start with http or https
	const fileURLRegex = /^(http|s:\/\/)/;

	let filesList = [];

	data.meshConfig.sources.forEach(source => {
		// JSONSchema handler
		source.handler.JsonSchema?.operations.forEach(operation => {
			if (operation.requestSchema && !fileURLRegex.test(operation.requestSchema)) {
				filesList.push(operation.requestSchema);
			}
			if (operation.responseSchema && !fileURLRegex.test(operation.responseSchema)) {
				filesList.push(operation.responseSchema);
			}
			if (operation.requestSample && !fileURLRegex.test(operation.requestSample)) {
				filesList.push(operation.requestSample);
			}
			if (operation.responseSample && !fileURLRegex.test(operation.responseSample)) {
				filesList.push(operation.responseSample);
			}
		});

		// OpenAPI handler
		if (source.handler.openapi && !fileURLRegex.test(source.handler.openapi.source)) {
			filesList.push(source.handler.openapi.source);
		}
	});

	// Additional Resolvers
	data.meshConfig.additionalResolvers?.forEach(additionalResolver => {
		if (typeof additionalResolver === 'string' && !fileURLRegex.test(additionalResolver)) {
			filesList.push(additionalResolver);
		}
	});

	// ReplaceField Transform - source level
	data.meshConfig.sources.transforms?.forEach(transform => {
		transform.replaceField?.replacements.forEach(replacement => {
			if (replacement.composer && !fileURLRegex.test(replacement.composer)) {
				const [filename] = replacement.composer.split('#');

				filesList.push(filename);
			}
		});
	});

	// ReplaceField Transform - mesh level
	data.meshConfig.transforms?.forEach(transform => {
		transform.replaceField?.replacements.forEach(replacement => {
			if (replacement.composer && !fileURLRegex.test(replacement.composer)) {
				const [filename] = replacement.composer.split('#');

				filesList.push(filename);
			}
		});
	});

	// Hooks Plugin - mesh level
	data.meshConfig.plugins?.forEach(plugin => {
		if (plugin.hooks) {
			if (plugin.hooks.beforeAll) {
				const composer = plugin.hooks.beforeAll.composer;

				if (composer && !fileURLRegex.test(composer)) {
					const [filename] = composer.split('#');

					filesList.push(filename);
				}
			}
		}
	});

	// OnFetch plugin - mesh level
	data.meshConfig.plugins?.forEach(plugin => {
		if (plugin.onFetch) {
			plugin.onFetch.forEach(onFetchConfig => {
				const handler = onFetchConfig.handler;

				if (handler) {
					filesList.push(handler);
				}
			});
		}
	});

	// remove duplicate files
	filesList = [...new Set(filesList)];

	logger.info(`Files to be imported: ${filesList.join(', ')}`);

	try {
		if (filesList.length) {
			checkFilesAreUnderMeshDirectory(filesList, meshConfigName);
			validateFileType(filesList);
			validateFileName(filesList);
		}
	} catch (err) {
		logger.error(err.message);
		throw new Error(err.message);
	}

	return filesList;
}

/**
 * Checks if files are in the same directory or subdirectories of mesh
 *
 * @param data MeshConfig
 * @param meshConfigName MeshConfig
 */
function checkFilesAreUnderMeshDirectory(filesList, meshConfigName) {
	//handle files that are outside to the directory and subdirectories of meshConfig
	let invalidPaths = [];
	for (let i = 0; i < filesList.length; i++) {
		if (
			!path
				.resolve(path.dirname(meshConfigName), filesList[i])
				.includes(path.resolve(path.dirname(meshConfigName))) ||
			filesList[i].includes('~')
		) {
			invalidPaths.push(path.basename(filesList[i]));
		}
	}

	filesOutsideRootDir(invalidPaths);
}

/**
 * Error out if the files are outside the mesh directory
 *
 * @param invalidPaths Array
 */
function filesOutsideRootDir(invalidPaths) {
	if (invalidPaths.length) {
		throw new Error(`File(s): ${invalidPaths.join(', ')} is outside the mesh directory.`);
	}
}

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
 * Check if the files are of valid types .js, .json
 *
 * @param filesList List of files in mesh config
 */
function validateFileType(filesList) {
	const filesWithInvalidTypes = [];

	filesList.forEach(file => {
		const extension = path.extname(file);
		const isValidFileType = ['.js', '.json'].includes(extension);

		if (!isValidFileType) {
			filesWithInvalidTypes.push(path.basename(file));
		}
	});

	if (filesWithInvalidTypes.length) {
		throw new Error(
			`Mesh files must be JavaScript or JSON. Other file types are not supported. The following file(s) are invalid: ${filesWithInvalidTypes}.`,
		);
	}
}

/**
 * Validate the filenames
 *
 * @param filesList Files in sources, tranforms or additionalResolvers in the meshConfig
 */
function validateFileName(filesList) {
	const filesWithInvalidNames = [];

	// Check if the file names are less than 25 characters
	filesList.forEach(file => {
		const fileName = path.basename(file);
		if (fileName.length > 25) {
			filesWithInvalidNames.push(fileName);
		}
	});

	if (filesWithInvalidNames.length) {
		throw new Error(
			`Mesh file names must be less than 25 characters. The following file(s) are invalid: ${filesWithInvalidNames}.`,
		);
	}
}

/**validates the environment file content
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

/**
 * Validate secrets file
 *
 * @param secretsFile Validates that secrets file extension is in yaml
 */
async function validateSecretsFile(secretsFile) {
	try {
		const validExtensions = ['.yaml', '.yml'];
		const fileExtension = secretsFile.split('.').pop().toLowerCase();
		if (!validExtensions.includes('.' + fileExtension)) {
			throw new Error(
				chalk.red('Invalid file format. Please provide a YAML file (.yaml or .yml).'),
			);
		}
	} catch (error) {
		logger.error(error.message);
		throw new Error(error.message);
	}
}

/**
 * Read the secrets file, checks validation and interpolate mesh
 *
 * @param secretsFilePath Secrets file path
 * @param command
 */
async function interpolateSecrets(secretsFilePath, command) {
	try {
		const secretsContent = await readFileContents(secretsFilePath, command, 'secrets');

		// Check if environment variables are used in the file content
		if (os.platform() === 'win32' && /\$({)?[a-zA-Z_][a-zA-Z0-9_]*}?/.test(secretsContent)) {
			throw new Error(chalk.red('Batch variables are not supported in YAML files on Windows.'));
		}
		const secrets = await parseSecrets(secretsContent);
		return secrets;
	} catch (err) {
		logger.error(err.message);
		throw new Error(err.message);
	}
}

/**
 * Parse secrets YAML content.
 *
 * @param secretsFilePath Secrets file path
 */
async function parseSecrets(secretsContent) {
	try {
		const envParserConfig = {
			outputFile: null,
			options: {
				all: false,
				diff: false,
				protect: false,
				syntax: 'dollar-both',
			},
			cli: false,
		};
		const compiledSecretsFileContent = parseEnv(secretsContent, envParserConfig);
		const parsedSecrets = YAML.parse(compiledSecretsFileContent);
		//check if secrets file is empty
		if (!parsedSecrets) {
			throw new Error(chalk.red('Invalid YAML file contents. Please verify and try again.'));
		}
		//check if parsedSecrets is string and not in k:v pair
		if (typeof parsedSecrets === 'string') {
			throw new Error(chalk.red('Please provide a valid YAML in key:value format.'));
		}
		const secretsYamlString = YAML.stringify(parsedSecrets);
		return secretsYamlString; //TODO: here we will encrypt secrets and return.
	} catch (err) {
		throw new Error(chalk.red(getSecretsYamlParseError(err)));
	}
}

/**
 * This function returns user friendly errors that occurs while YAML.parse
 *
 * @param error errors from YAML.parse
 */
function getSecretsYamlParseError(error) {
	if (error.code === 'BAD_INDENT') {
		return 'Invalid YAML - Bad Indentation: ' + error.message;
	} else if (error.code === 'DUPLICATE_KEY') {
		return 'Invalid YAML - Found Duplicate Keys: ' + error.message;
	} else {
		return 'Unexpected Error: ' + error.message;
	}
}

/**
 * Performs hybrid encryption of secrets(AES + RSA)
 *
 * @param publicKey Public key for (AES + RSA) encryption
 * @param secrets Secrets Data that needs encryption
 */
async function encryptSecrets(publicKey, secrets) {
	if (!publicKey || typeof publicKey !== 'string' || !publicKey.trim()) {
		throw new Error(chalk.red('Unable to encrypt secerts. Invalid Public Key.'));
	}
	try {
		// Generate a random AES key and IV
		const aesKey = crypto.randomBytes(32); // 256-bit key for AES-256
		const iv = crypto.randomBytes(16); // Initialization vector
		// Encrypt the secrets using AES-256-CBC
		const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
		let encryptedData = cipher.update(secrets, 'utf8', 'base64');
		encryptedData += cipher.final('base64');
		// Encrypt the AES key using RSA with OAEP padding
		const encryptedAesKey = crypto.publicEncrypt(
			{
				key: publicKey,
				padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
			},
			aesKey,
		);
		// Package the encrypted AES key, IV, and encrypted data
		const encryptedPackage = {
			iv: iv.toString('base64'),
			key: encryptedAesKey.toString('base64'),
			data: encryptedData,
		};
		return JSON.stringify(encryptedPackage);
	} catch (error) {
		logger.error('Unable to encrypt secrets. Please try again. :', error.message);
		throw new Error(`Unable to encrypt secerts. ${error.message}`);
	}
}

module.exports = {
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	getFilesInMeshConfig,
	envFileFlag,
	checkPlaceholders,
	readFileContents,
	validateEnvFileFormat,
	validateAndInterpolateMesh,
	getAppRootDir,
	portNoFlag,
	debugFlag,
	selectFlag,
	secretsFlag,
	interpolateSecrets,
	validateSecretsFile,
	encryptSecrets,
};
