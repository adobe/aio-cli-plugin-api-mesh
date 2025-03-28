const path = require('path');

/**
 * Whether file is TypeScript
 * @param filePath Filepath
 */
function isTypeScriptFile(filePath) {
	const ext = path.extname(filePath);
	return ext === '.ts' || ext === '.tsx';
}

/**
 * Converts composer string to static imports compatible with bundling
 * @param data {string} Data read from the built mesh
 * @returns {string} Updated data
 * @example Converts composer string
 * ```
 * "beforeAll": {
 *     "composer": "/Users/user/project/hooks.js#isAuth",
 *     "blocking": true
 * }
 * ```
 * To:
 * ```
 * "beforeAll": {
 *     "module": await import("/Users/user/project/hooks.js"), "fn": "isAuth",
 *         "blocking": true
 * }
 * ```
 */
function resolveComposerAsTypeScriptModule(data) {
	return data.replace(
		/"composer":\s*"([^#]+)#([^"]+)"/,
		`"module": await import("$1"), "fn": "$2"`,
	);
}

/**
 * Converts composer string to static imports compatible with bundling
 * @param data {string} Data read from the built mesh
 * @returns {string} Updated data
 * @example Converts composer string
 * ```
 * "beforeAll": {
 *     "composer": "/Users/user/project/hooks.js#isAuth",
 *     "blocking": true
 * }
 * ```
 * To:
 * ```
 * "beforeAll": {
 *     "module": __importStar(require("/Users/user/project/hooks.js")), "fn": "isAuth",
 *         "blocking": true
 * }
 * ```
 */
function resolveComposerAsJavaScriptModule(data) {
	return data.replace(
		/"composer":\s*"([^#]+)#([^"]+)"/,
		`"module": __importStar(require("$1")), "fn": "$2"`,
	);
}

/**
 * Takes a mesh artifact and converts composer configuration to static imports
 * compatible with bundling
 * @param meshArtifactPath Path to the mesh artifact used to determine extension
 * @param data {string} Data read from the built mesh
 * @returns {string} Updated data
 * @see {@link resolveComposerAsJavaScriptModule}
 * @see {@link resolveComposerAsTypeScriptModule}
 */
function resolveComposerAsStaticImport(meshArtifactPath, data) {
	return isTypeScriptFile(meshArtifactPath)
		? resolveComposerAsTypeScriptModule(data)
		: resolveComposerAsJavaScriptModule(data);
}

module.exports = {
	isTypeScriptFile,
	resolveComposerAsTypeScriptModule,
	resolveComposerAsJavaScriptModule,
	resolveComposerAsStaticImport,
};
