const fs = require('fs');
const path = require('path');
const makeCancellablePromise = require('make-cancellable-promise');
const Timeout = require('await-timeout');
const fetch = require('node-fetch');

const MAX_TTL = 60 * 60 * 1000;
const MIN_TTL = 60 * 1000;

/**
 * Read .meshrc.json file stored in the mesh-artifact for a particular mesh
 * Parse the file and store into meshConfig object
 * @param appRootDir
 * @param meshId
 */
function readMeshConfig(meshId) {
	const configPath = path.resolve(process.cwd(), 'mesh-artifact', `${meshId}`, '.meshrc.json');
	if (fs.existsSync(configPath)) {
		const meshrcFile = fs.readFileSync(configPath).toString();
		console.log(`meshrcFile: ${meshrcFile}`);
		return JSON.parse(meshrcFile);
	}
}

/**
 * @param meshId
 * @param meshConfig
 */
function processFetchConfig(meshId, meshConfig) {
	if (meshConfig?.runtimeConfig?.contextConfig?.fetchConfig?.allowedDomains) {
		console.log(
			`FetchConfig for ${meshId} : ${JSON.stringify(
				meshConfig?.runtimeConfig?.contextConfig?.fetchConfig,
			)}`,
		);
		return meshConfig?.runtimeConfig?.contextConfig?.fetchConfig;
	} else return { allowedDomains: [] };
}

/**
 * @param meshId
 * @param meshConfig
 */
function processCacheConfig(meshId, meshConfig) {
	const contextCacheConfig = meshConfig?.runtimeConfig?.contextConfig?.cacheConfig;
	const contextCacheConfigTtl = contextCacheConfig?.ttl
		? contextCacheConfig.ttl * 60 * 1000
		: MIN_TTL;
	const max = 100;
	const ttl = Math.min(contextCacheConfigTtl, MAX_TTL);
	return {
		max,
		ttl,
		dispose: (value, key) => {
			console.log(`\n\n\n${meshId} - Removing ${key} from context cache\n\n\n`);
		},
	};
}

/**
 * @param appRootDir
 * @param meshId
 */
function processContextConfig(meshId, meshConfig) {
	console.log('Processing the context config from meshConfig');
	const fetchConfig = processFetchConfig(meshId, meshConfig);
	const cacheConfig = processCacheConfig(meshId, meshConfig);
	return {
		fetchConfig,
		cacheConfig,
	};
}

/**
 * timedPromise wraps a Promise with a timeout and a cancel function
 * This will allow the function to not run forever if it takes too long
 * and keep the event loop occupied. If the function is taking is longer than
 * 15 seconds, the promise will be cancelled with a Timeout error.
 *
 * @returns Promise that can be cancelled if timed out
 * @param promise
 */
async function timedPromise(promise) {
	const { promise: newPromise, cancel } = makeCancellablePromise(promise);
	try {
		// Timeout promise after 15 seconds of inactivity
		const FETCHER_TIMEOUT = 15000;
		return await Timeout.wrap(newPromise, FETCHER_TIMEOUT, 'Timeout');
	} catch (err) {
		console.error(err);
		//To do : Requires proper handling of errors. To use function cancel
		if (err.message === 'Timeout') {
			cancel();
		}
		return Promise.reject(err);
	}
}

async function invokeRemoteFetch(url, params) {
	console.log('Invoking remote fetch url %s', url);
	if (params !== undefined) {
		const requestOptions = {
			method: 'POST',
			body: JSON.stringify(params),
			headers: {
				'Content-Type': 'application/json',
			},
		};
		return await timedPromise(fetch(url, requestOptions));
	} else {
		return await timedPromise(fetch(url));
	}
}

module.exports = {
	readMeshConfig,
	processContextConfig,
	invokeRemoteFetch,
};
