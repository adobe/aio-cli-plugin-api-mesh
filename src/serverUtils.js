const fs = require('fs');
const path = require('path');
const makeCancellablePromise = require('make-cancellable-promise');
const Timeout = require('await-timeout');
const fetch = require('node-fetch');
const LRUCache = require('lru-cache');
const logger = require('./classes/logger');

const MAX_TTL = 60 * 60 * 1000;
const MIN_TTL = 60 * 1000;

const headersCache = new LRUCache({
	max: parseInt(process.env.CACHE_OPT_MAX || '500', 10),
	ttl: parseInt(process.env.CACHE_HEADERS_TTL || '300000', 10), // 5 mins
	dispose: (value, key, reason) => {
		logger.info(`Removing headers for ${key} from headers cache because ${reason}`);
	},
});

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

function removeRequestHeaders(requesId) {
	headersCache.delete(requesId);
}

/**
 * This function loops through the mesh http details plugin and saves the response headers into an LRU cache
 * @param meshHTTPDetails this is the object coming from the graphql-mesh plugin that contains information about the different sources
 * @param requestId
 */
function prepSourceResponseHeaders(meshHTTPDetails, requestId) {
	const mappedResponseHeaders = [];
	//const requestId = request_context_1.requestContext.get('requestId');
	meshHTTPDetails?.forEach(element => {
		const headers = Object.entries(element.response.headers);
		headers?.forEach(value => {
			const header = value[0];
			const headerValue = value[1];
			const sourceName = element.sourceName;
			const url = element.request.url;
			const mappedResponseHeader = {
				name: header.toLowerCase(),
				source: sourceName,
				values: [headerValue],
			};
			const sourceMarkedHeader = {
				name:
					//we want to return all the original headers from magento and source prefixed for everyone else
					header.toLowerCase() !== 'cache-control' && !url.toLowerCase().includes('magento')
						? `x-${element.sourceName}-${header.toLowerCase()}`
						: header.toLowerCase(),
				source: sourceName,
				values: [headerValue],
			};
			mappedResponseHeaders.push(sourceMarkedHeader);
			mappedResponseHeaders.push(mappedResponseHeader);
		});
		//Update the headers LRU cache
		setSourceResponseHeaders(requestId, mappedResponseHeaders);
	});
}

function setSourceResponseHeaders(requestId, responseHeaders) {
	if (headersCache.has(requestId)) {
		const currentResponseHeaders = headersCache.get(requestId);
		const concatResponseHeaders = currentResponseHeaders.concat(responseHeaders);
		headersCache.set(requestId, concatResponseHeaders);
	} else {
		headersCache.set(requestId, responseHeaders);
	}
}

/**
 *
 * @param meshId
 * @param requestId
 * @param includeMetadata
 * @param method
 * @returns {Object.<string, string|string[]>}
 */
function processResponseHeaders(meshId, requestId, includeMetadata, method) {
	const meshResponseConfig = getMeshResponseConfig(meshId);
	const responseHeaders = headersCache.get(requestId);
	const sourceResponseConfig = getSourceResponseHeaders(
		responseHeaders,
		meshId,
		requestId,
		includeMetadata,
	);
	processMeshResponseHeaders(meshResponseConfig, sourceResponseConfig, method, responseHeaders);
}

function getMeshResponseConfig(meshId) {
	const meshConfig = readMeshConfig(meshId);
	return meshConfig?.responseConfig;
}

function getSourceResponseHeaders(responseHeaders, meshId, requestId, includeMetadata) {
	const sourceResponseHeaders = {};
	const sourceResponseHeadersMap = new Map();

	const currentWorkingDirectory = process.cwd();
	const meshConfigPath = `${currentWorkingDirectory}/mesh-artifact/${meshId}/.meshrc.json`;

	const meshConfig = require(meshConfigPath);
	if (meshConfig) {
		meshConfig.sources.forEach(source => {
			if (source.responseConfig && source.responseConfig.headers) {
				sourceResponseHeadersMap.set(source.name, source.responseConfig.headers);
			}
		});
		responseHeaders?.forEach(element => {
			const respArray = sourceResponseHeadersMap.get(element.source);
			const lower = respArray?.map(element => {
				return element.toLowerCase();
			});
			if (lower && lower.includes(element.name)) {
				sourceResponseHeaders[element.name] = element.values;
			}
			if (includeMetadata) {
				sourceResponseHeaders[element.name] = element.values;
			}
		});
	} else {
		logger.error(`No meshid ${meshId} found for requestId: ${requestId}`);
		throw new Error(`No meshid ${meshId} found`, 'getSourceResponseHeaders', requestId);
	}
	//  }
	return sourceResponseHeaders || {};
}

function processMeshResponseHeaders(
	meshResponseConfig,
	sourceResponseConfig,
	method,
	responseHeaders,
) {
	//Since we do not want any caching to happen on posts we need to make sure any cache-control headers
	//are removed on posts. This includes at the mesh and source level
	if (method.toLowerCase() === 'post') {
		const removedCacheHeadersConfig = Object.fromEntries(
			Object.entries(sourceResponseConfig).map(([k, v]) => [k.toLowerCase(), v]),
		);
		delete removedCacheHeadersConfig['cache-control'];
		//if there are mesh headers we want to remove them as well
		if (meshResponseConfig && meshResponseConfig.headers) {
			const meshHeaders = Object.fromEntries(
				Object.entries(meshResponseConfig.headers).map(([k, v]) => [
					k.toLowerCase(),
					v.toLowerCase(),
				]),
			);
			delete meshHeaders['cache-control'];
			return { ...meshHeaders } || {};
		}
		return { ...removedCacheHeadersConfig } || {};
	}
	//All other requests go through the usual path
	if (meshResponseConfig && meshResponseConfig.headers) {
		//make sure we are standardizing all the headers
		const meshHeaders = Object.fromEntries(
			Object.entries(meshResponseConfig.headers).map(([k, v]) => [
				k.toLowerCase(),
				v.toLowerCase(),
			]),
		);
		return { ...meshHeaders, ...sourceResponseConfig } || {};
	} else {
		if (responseHeaders) {
			const ccDirectives = getCacheControlDirectives(responseHeaders);
			return { ...sourceResponseConfig, ...ccDirectives } || {};
		}
	}
	return { ...sourceResponseConfig } || {};
}

/**
 * Returns the lowest common denominator on all the sources cache-control headers
 * @param responseHeaders
 * @returns
 */
function getCacheControlDirectives(responseHeaders) {
	const cacheControlHeaders = responseHeaders.filter(header => {
		return header.name === 'cache-control';
	});
	const cacheControlDirectives = {};
	cacheControlHeaders.forEach(header => {
		const directives = header.values[0].split(',');
		directives.forEach(directive => {
			const [key, value] = directive.split('=');
			cacheControlDirectives[key.trim()] = value.trim();
		});
	});
	return cacheControlDirectives;
}

module.exports = {
	readMeshConfig,
	processContextConfig,
	invokeRemoteFetch,
	removeRequestHeaders,
	prepSourceResponseHeaders,
	processResponseHeaders,
};