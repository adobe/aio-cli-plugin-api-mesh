const fs = require('fs');
const path = require('path');
const LRUCache = require('lru-cache');
const logger = require('./classes/logger');
const YAML = require('yaml');

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

		return JSON.parse(meshrcFile);
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
	return processMeshResponseHeaders(
		meshResponseConfig,
		sourceResponseConfig,
		method,
		responseHeaders,
	);
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
	let ccDirectives = {};
	responseHeaders?.forEach(element => {
		if (element.name.toLowerCase() === 'cache-control') {
			const currentCacheMap = parseCacheControl(element.values.toString());
			const standardDizedCacheMap = Object.fromEntries(
				Object.entries(currentCacheMap).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()]),
			);
			ccDirectives = resolveCacheDirectives(ccDirectives, standardDizedCacheMap);
		}
	});
	return { 'cache-control': ccDirectivesToString(ccDirectives) };
}

/**
 * Parses out the cache-control headers into a map
 * @param directives
 * @returns
 */
function parseCacheControl(directives) {
	//                     1: directive                                                  =   2: token                                              3: quoted-string
	// eslint-disable-next-line
	const regex = /(?:^|(?:\s*\,\s*))([^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)(?:\=(?:([^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)|(?:\"((?:[^"\\]|\\.)*)\")))?/g;
	const header = {};
	const err = directives.replace(regex, function ($0, $1, $2, $3) {
		const value = $2 || $3;
		header[$1] = value ? value.toLowerCase() : $1;
		return '';
	});
	return err ? {} : header;
}

/**
 * Runs a lowest common denominator algorithm on the current source cache-control header
 * @param lowestValuesCacheDirectives - object containing the lowest values of the cache-control headers
 * @param currentDirectives - current source cache-control headers
 * @returns lowestValuesCacheDirectives
 */
function resolveCacheDirectives(lowestValuesCacheDirectives, currentDirectives) {
	//if any header contains no-store, we are done
	if (lowestValuesCacheDirectives['no-store']) {
		return lowestValuesCacheDirectives;
	}
	if (currentDirectives['no-store']) {
		lowestValuesCacheDirectives = {};
		lowestValuesCacheDirectives['no-store'] = 'no-store';
		return lowestValuesCacheDirectives;
	}
	//id min values for each of these directives
	const minDirectives = [
		'min-fresh',
		'max-age',
		'max-stale',
		's-maxage',
		'stale-if-error',
		'stale-while-revalidate',
	];
	minDirectives.forEach(element => {
		updateToMin(element, currentDirectives[element], lowestValuesCacheDirectives);
	});
	//add these directives, if they are not already present
	const otherDirectives = [
		'public',
		'private',
		'immutable',
		'no-cache',
		'no-transform',
		'must-revalidate',
		'proxy-revalidate',
		'must-understand',
	];
	Object.keys(currentDirectives).forEach(key => {
		if (otherDirectives.includes(key) && !lowestValuesCacheDirectives[key]) {
			lowestValuesCacheDirectives[key] = currentDirectives[key];
		}
	});
	return lowestValuesCacheDirectives;
}

/**
 * Updates a cache-control header value to the lowest value if required
 * @param key
 * @param candidateMin
 * @param cachedHeaders
 * @returns
 */
function updateToMin(key, candidateMin, cachedHeaders) {
	//first check if both values exist and are not undefined
	if (cachedHeaders[key] && candidateMin) {
		//if the value to be replaced is not a number and the candidate is a number we do a direct replacement
		if (isNaN(Number(cachedHeaders[key])) && !isNaN(Number(candidateMin))) {
			cachedHeaders[key] = candidateMin;
		}
		//if both values are integers and the candidate is lower than the existing lowest value, replace the current value with the candidate
		else if (!isNaN(Number(cachedHeaders[key])) && !isNaN(Number(candidateMin))) {
			if (Number(cachedHeaders[key]) > Number(candidateMin)) {
				cachedHeaders[key] = candidateMin;
			}
		}
	}
	//do a direct in-place update of the existing array
	else if (candidateMin) {
		cachedHeaders[key] = candidateMin;
	}
	return cachedHeaders;
}

/**
 * Returns the cache-control headers as a string
 * @param directives
 * @returns
 */
function ccDirectivesToString(directives) {
	const chStr = [];
	Object.keys(directives).forEach(key => {
		if (directives[key] === key) {
			chStr.push(key);
		} else {
			chStr.push(key + '=' + directives[key]);
		}
	});
	return chStr.toString();
}

function readSecretsFile(meshId){
	const filePath = path.resolve(process.cwd(), 'mesh-artifact', `${meshId}`, 'secrets.yaml');
	if (fs.existsSync(filePath)) {
		const secretsFile = fs.readFileSync(filePath, 'utf8');

		return YAML.parse(secretsFile);
	}
}

module.exports = {
	readMeshConfig,
	removeRequestHeaders,
	prepSourceResponseHeaders,
	processResponseHeaders,
	readSecretsFile,
};
