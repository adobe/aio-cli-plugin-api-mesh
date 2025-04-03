const path = require('path');
const fs = require('fs');
const { fixPlugins } = require('./fixPlugins');
const logger = require('../src/classes/logger');

/**
 * Whether file is TypeScript
 * @param filePath Filepath
 */
function isTypeScriptFile(filePath) {
	const ext = path.extname(filePath);
	return ext === '.ts' || ext === '.tsx';
}

/**
 * Gets
 * @param builtMeshTenantDir
 * @returns {string}
 */
function getBuiltMeshEntrypoint(builtMeshTenantDir) {
	let builtMeshIndexPath = path.join(builtMeshTenantDir, 'index');
	return fs.existsSync(`${builtMeshIndexPath}.ts`)
		? `${builtMeshIndexPath}.ts`
		: `${builtMeshIndexPath}.js`;
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

/**
 * Converts handler string to static imports compatible with bundling
 * @param data {string} Data read from the built mesh
 * @returns {string} Updated data
 * @example Converts composer string
 * ```
 * "onFetch": {
 *     "handler": "/Users/user/project/fetch.js",
 *     "blocking": true
 * }
 * ```
 * To:
 * ```
 * "onFetch": {
 *     "handler": await import("/Users/user/project/fetch.js"),
 *         "blocking": true
 * }
 * ```
 */
function resolveHandlerAsTypeScriptModule(data) {
	return data.replace(/"handler":\s*"([^"]+)"/, `"module": await import("$1")`);
}

/**
 * Converts handler string to static imports compatible with bundling
 * @param data {string} Data read from the built mesh
 * @returns {string} Updated data
 * @example Converts composer string
 * ```
 * "onFetch": {
 *     "handler": "/Users/user/project/fetch.js",
 *     "blocking": true
 * }
 * ```
 * To:
 * ```
 * "onFetch": {
 *     "module": __importStar(require("/Users/user/project/fetch.js")),
 *         "blocking": true
 * }
 * ```
 */
function resolveHandlerAsJavaScriptModule(data) {
	return data.replace(/"handler":\s*"([^"]+)"/, `"module": __importStar(require("$1"))`);
}

/**
 * Takes a mesh artifact and converts handler configuration to static imports
 * compatible with bundling
 * @param meshArtifactPath Path to the mesh artifact used to determine extension
 * @param data {string} Data read from the built mesh
 * @returns {string} Updated data
 * @see {@link resolveHandlerAsJavaScriptModule}
 * @see {@link resolveHandlerAsTypeScriptModule}
 */
function resolveHandlerAsStaticImport(meshArtifactPath, data) {
	return isTypeScriptFile(meshArtifactPath)
		? resolveHandlerAsTypeScriptModule(data)
		: resolveHandlerAsJavaScriptModule(data);
}

const resolveRelativeSources = async builtMeshTenantDir => {
	let builtMeshPath = getBuiltMeshEntrypoint(builtMeshTenantDir);

	// Fix http details extensions plugin for edge compatibility
	await fixPlugins(builtMeshPath);

	// Read tenant files inventory
	const artifactFilesPath = path.join(builtMeshTenantDir, 'files.json');
	if (fs.existsSync(artifactFilesPath)) {
		// Read mesh artifact
		let builtMeshData = fs.readFileSync(builtMeshPath).toString();

		const parentDirRegex = new RegExp('../tenantFiles'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
		builtMeshData = builtMeshData.replace(parentDirRegex, './tenantFiles');

		// Write the modified mesh artifact
		fs.writeFileSync(builtMeshPath, builtMeshData, 'utf8');
	}
};

/**
 * Resolve original sources to materialized files in mesh artifact for local development and debugging
 * @param builtMeshTenantDir Built mesh tenant directory
 * @param localFileOverrides Local file overrides
 */
const resolveOriginalSources = async (builtMeshTenantDir, localFileOverrides) => {
	let builtMeshPath = getBuiltMeshEntrypoint(builtMeshTenantDir);

	// Read tenant files inventory
	const artifactFilesPath = path.join(builtMeshTenantDir, 'files.json');
	if (fs.existsSync(artifactFilesPath)) {
		let files = {};
		try {
			files = JSON.parse(fs.readFileSync(artifactFilesPath).toString());
		} catch (err) {
			logger.error('Malformed "files.json" file. Skipping original source resolution.');
		}

		// Read mesh artifact
		let builtMeshData = fs.readFileSync(builtMeshPath).toString();
		files.files.forEach(file => {
			// Skip replacement of files for local development when the user was prompted
			// to override and answered no
			if (
				Object.keys(localFileOverrides).includes(file.path) &&
				localFileOverrides[file.path] === false
			) {
				return;
			}

			// When the source exists in project use it instead of the materialized file
			const absoluteFilePath = path.resolve(file.path);

			// Replace all occurrences of the materialized path with the fully qualified original path when it exists
			if (fs.existsSync(absoluteFilePath)) {
				const regex = new RegExp(file.materializedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
				builtMeshData = builtMeshData.replace(regex, absoluteFilePath);
				builtMeshData = resolveComposerAsStaticImport(builtMeshPath, builtMeshData);
				builtMeshData = resolveHandlerAsStaticImport(builtMeshPath, builtMeshData);
			}
		});

		// Write the modified mesh artifact
		fs.writeFileSync(builtMeshPath, builtMeshData, 'utf8');
	}
};

module.exports = {
	isTypeScriptFile,
	resolveComposerAsTypeScriptModule,
	resolveComposerAsJavaScriptModule,
	resolveComposerAsStaticImport,
	resolveRelativeSources,
	resolveOriginalSources,
};
