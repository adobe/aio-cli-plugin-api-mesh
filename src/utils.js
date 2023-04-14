const fs = require('fs');
const path = require('path');
const jsmin = require('jsmin').jsmin;
const logger = require('../src/classes/logger');

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
			checkFilesAreUnderMeshDirectory(filesList, meshConfigName);
			validateFileType(filesList);
			validateFileName(filesList, data);
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
				throw new Error(`Please make sure the file names are matching in meshConfig.`);
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
		let readFileData = fs.readFileSync(
			path.resolve(path.dirname(meshConfigName), file),
			{ encoding: 'utf-8' },
			err => {
				if (err) {
					throw new Error(err);
				}
			},
		);

		try {
			//validate JSON file
			if (path.extname(file) === '.json') {
				readFileData = JSON.stringify(JSON.parse(readFileData));
			}
		} catch (err) {
			logger.error(err.message);
			throw new Error(`Invalid JSON content in ${path.basename(file)}`);
		}

		//data to be overridden or appended
		const dataInFilesArray = jsmin(readFileData);

		if (index >= 0) {
			data.meshConfig.files[index] = {
				path: file,
				content: dataInFilesArray,
			};
		} else {
			//if the files array does not exist
			if (!data.meshConfig.files) {
				data.meshConfig.files = [];
			}

			//if the files arrray exists, we append the file path and content in meshConfig
			data.meshConfig.files.push({
				path: file,
				content: dataInFilesArray,
			});
		}

		return data;
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
