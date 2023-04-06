const fs = require('fs');
const path = require('path');
const jsmin = require('jsmin').jsmin;
const logger = require('../src/classes/logger');
const promptConfirm = require('./helpers');
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

const { Flags } = require('@oclif/core');

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

/**
 * Parse the meshConfig and get the list of (local) files to be imported
 *
 * @param data MeshConfig
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
		if (!fileURLRegex.test(additionalResolver)) {
			filesList.push(additionalResolver);
		}
	});

	// ReplaceField Transform - source level
	data.meshConfig.sources.transforms?.forEach(transform => {
		transform.replaceField?.replacements.forEach(replacement => {
			if (replacement.composer && !fileURLRegex.test(replacement.composer)) {
				filesList.push(replacement.composer);
			}
		});
	});

	// ReplaceField Transform - mesh level
	data.meshConfig.transforms?.forEach(transform => {
		transform.replaceField?.replacements.forEach(replacement => {
			if (replacement.composer && !fileURLRegex.test(replacement.composer)) {
				filesList.push(replacement.composer);
			}
		});
	});

	try {
		if (filesList.length) {
			validateFileType(filesList);
			validateFileName(filesList, data);
			validateFilePaths(filesList, meshConfigName);
		}
	} catch (err) {
		logger.error(err.message);
		throw new Error(err.message);
	}

	return filesList;
}

/**
 * Validate if the meshConfig file and other (js, json) files are in same directory
 *
 * @param filesList List of files in meshConfig
 * @param meshConfigName MeshConfig file name
 */
function validateFilePaths(filesList, meshConfigName) {
	try {
		for (let file of filesList) {
			// throw error, if the meshConfig and the file are not in the same directory
			if (!fs.existsSync(path.resolve(path.dirname(meshConfigName), file))) {
				throw new Error(
					`Please make sure the files ${path.basename(file)} and ${path.basename(
						meshConfigName,
					)} are in the same directory.`,
				);
			}
		}
	} catch (err) {
		throw new Error(err.message);
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
			filesWithInvalidTypes.push(file);
		}
	});

	if (filesWithInvalidTypes.length) {
		throw new Error(
			`Mesh files must be JavaScript or JSON. Other file types are not supported. The following file(s) are invalid: ${path.basename(
				filesWithInvalidTypes[0],
			)}.`,
		);
	}
}

/**
 * Validate the filenames
 *
 * @param filesList Files in sources, tranforms or additionalResolvers in the meshConfig
 * @param data MeshConfig
 */
function validateFileName(filesList, data) {
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

	// check if the the filePaths in the files array match
	// the fileNames in sources, transforms or additionalResolvers
	if (data.meshConfig.files) {
		for (let i = 0; i < data.meshConfig.files.length; i++) {
			if (filesList.indexOf(data.meshConfig.files[i].path) == -1) {
				throw new Error(
					`Please make sure the file names are matching in both places in meshConfig.`,
				);
			}
		}
	}
}

/**
 * Append/override files to the files array in meshConfig
 *
 * @param data MeshConfig
 * @param file File to append or override
 * @param meshConfigName MeshConfig name
 * @param index Append operation if index is -1, else override, it is the index where the override takes place
 */
function updateFilesArray(data, file, meshConfigName, index) {
	try {
		const readFileData = fs.readFileSync(
			path.resolve(path.dirname(meshConfigName), file),
			{ encoding: 'utf-8' },
			err => {
				if (err) {
					throw new Error(err);
				}
			},
		);

		//data to be overridden or appended
		const dataInFilesArray = jsmin(readFileData);

		if (index >= 0) {
			data.meshConfig.files[index] = {
				path: `${file}`,
				content: `${dataInFilesArray}`,
			};
		} else {
			//if the files array does not exist
			if (!data.meshConfig.files) {
				data.meshConfig.files = [];
			}

			//if the files arrray exists, we append the file path and content in meshConfig
			data.meshConfig.files.push({
				path: `./${path.basename(file)}`,
				content: `${dataInFilesArray}`,
			});
		}

		fs.writeFileSync(path.resolve(meshConfigName), JSON.stringify(data, null, 2), err => {
			if (err) {
				throw new Error(err);
			}
			logger.debug(`${file} appended to the meshConfig`);
		});
	} catch (err) {
		logger.error(err.message);
		throw new Error(err.message);
	}
}

module.exports = {
	objToString,
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	getFilesInMeshConfig,
	updateFilesArray,
};
