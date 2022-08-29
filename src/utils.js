/**
 * Returns the string representation of the object's path.
 * If the path evaluates to false, the default string is returned.
 *
 * @param {object} obj
 * @param {array<string>} path
 * @param {string} defaultString
 *
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

module.exports = {
	objToString,
	ignoreCacheFlag,
	autoConfirmActionFlag,
};
