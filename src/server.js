// Resolve the path to 'fastify' and 'graphql-yoga' within the local 'node_modules'
const fastifyPath = require.resolve('fastify', { paths: [process.cwd()] });
const yogaPath = require.resolve('graphql-yoga', { paths: [process.cwd()] });

// Load 'fastify' and 'graphql-yoga' using the resolved paths
const fastify = require(fastifyPath);
const { createYoga } = require(yogaPath);
const logger = require('./classes/logger');

//Load the functions from serverUtils.js
const {
	readMeshConfig,
	processContextConfig,
	invokeRemoteFetch,
	removeRequestHeaders,
	prepSourceResponseHeaders,
	processResponseHeaders,
} = require('./serverUtils');

const LRU = require('lru-cache');
const URL = require('url');

let yogaServer = null;
let meshConfig;

// catch unhandled promise rejections
process.on('unhandledRejection', reason => {
	logger.error('Unhandled Rejection at:', reason.stack || reason);
});

// catch uncaught exceptions
process.on('uncaughtException', err => {
	logger.error('Uncaught Exception thrown');
	logger.error(err.stack);
	process.exit(1);
});

// get meshId from command line arguments
const meshId = process.argv[2];

// get PORT number from command line arguments
const portNo = parseInt(process.argv[3]);

// get includeHTTPDetails from command line arguments
const isTI = process.argv[4];

const getCORSOptions = () => {
	try {
		const currentWorkingDirectory = process.cwd();
		const meshConfigPath = `${currentWorkingDirectory}/mesh-artifact/${meshId}/.meshrc.json`;

		const meshConfig = require(meshConfigPath);
		const { responseConfig } = meshConfig;
		const { CORS } = responseConfig;

		return CORS;
	} catch (e) {
		return {};
	}
};

const getYogaServer = async () => {
	if (yogaServer) {
		return yogaServer;
	} else {
		const currentWorkingDirectory = process.cwd();
		const meshArtifactsPath = `${currentWorkingDirectory}/mesh-artifact/${meshId}`;

		const meshArtifacts = require(meshArtifactsPath);
		const { getBuiltMesh } = meshArtifacts;

		const tenantMesh = await getBuiltMesh();
		const corsOptions = getCORSOptions();

		logger.info('Creating graphQL server');

		meshConfig = readMeshConfig(meshId);

		if (isTI === 'true') {
			// TI customers get access to fetcher and sessionCache
			//create context config
			const { fetchConfig, cacheConfig } = processContextConfig(meshId, meshConfig);
			const contextCache = new LRU(cacheConfig);

			const allowedDomainsMap = fetchConfig.allowedDomains?.reduce((acc, allowedDomain) => {
				acc[allowedDomain] = {};
				logger.info(`acc: ${acc}`);
				return acc;
			}, {});

			yogaServer = createYoga({
				cors: corsOptions,
				plugins: tenantMesh.plugins,
				graphqlEndpoint: '/graphql',
				graphiql: false,
				maskedErrors: false,
				context: initialContext => {
					return {
						...initialContext,
						sessionCache: contextCache,
						log: message => logger.info(`${meshId} - ${message}`),
						fetcher: async (url, options) => {
							const { protocol, host } = URL.parse(url);
							if (protocol !== 'https:') {
								throw new Error(`${url} is not a valid https url`);
							}
							const basePath = protocol + '//' + host;
							logger.info(`Host: ${host}`);
							logger.info(`Absolute base: ${basePath}`);
							logger.info(`allowedDomainsMap: ${JSON.stringify(allowedDomainsMap)}`);

							if (basePath !== null && allowedDomainsMap !== null) {
								if (!(basePath in allowedDomainsMap)) {
									logger.info(
										`host: ${host} and allowedDomainsMap: ${allowedDomainsMap} and stringified allowedDomain: ${JSON.stringify(
											allowedDomainsMap,
										)}`,
									);
									logger.error(`${url} is not allowed to be accessed`);
									throw new Error(`${url} is not allowed to be accessed`);
								} else {
									logger.info(
										`Fetching invokeRemoteFetch ${url} with options ${JSON.stringify(options)}`,
									);
									const response = await invokeRemoteFetch(url, options);
									const body = await response.text();
									logger.info(`Fetched ${url}. Response body: ${body}`);
									return { response, body };
								}
							}
						},
					};
				},
			});
		} else {
			yogaServer = createYoga({
				plugins: tenantMesh.plugins,
				graphqlEndpoint: `/graphql`,
				graphiql: true,
				cors: corsOptions,
			});
		}

		return yogaServer;
	}
};

const app = fastify();

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.route({
	method: ['GET', 'POST'],
	url: '/graphql',
	handler: async (req, res) => {
		logger.info('Request received: ', req.body);

		let body = null;
		let responseBody = null;
		let includeMetaData = false;

		if (req.headers['x-include-metadata'] && req.headers['x-include-metadata'].length > 0) {
			if (req.headers['x-include-metadata'].toLowerCase() === 'true') {
				includeMetaData = true;
			}
		}

		const response = await yogaServer.handleNodeRequest(req, {
			req,
			reply: res,
		});

		try {
			try {
				body = await response.text();
				if (body) {
					responseBody = JSON.parse(body);
				}
			} catch (err) {
				logger.error(`Error parsing response body: ${err}`);
				logger.error(response);
				throw new Error(`Error parsing response body: ${err}`);
			}
			//Set the value of includeHTTPDetails flag

			const includeHTTPDetails = !!meshConfig?.responseConfig?.includeHTTPDetails;
			const meshHTTPDetails = responseBody?.extensions?.httpDetails;
			logger.info('Mesh HTTP Details are : ', meshHTTPDetails);
			logger.info('includeMetadata is : ', includeMetaData);

			/* the logic for handling mesh response headers using includeMetaData */
			prepSourceResponseHeaders(meshHTTPDetails, req.id);
			const responseHeaders = processResponseHeaders(meshId, req.id, includeMetaData, req.method);

			/** Adding the yoga response headers to the response */
			response.headers?.forEach((value, key) => {
				res.header(key, value);
			});

			// Delete the httpDetails extensions details if mesh owner has disabled those details in the config
			if (includeHTTPDetails !== true) {
				delete responseBody?.extensions?.httpDetails;
			}

			//make sure to remove the request headers from cache after the request is complete
			removeRequestHeaders(req.id);
			const fastifyResponseBody = JSON.stringify(responseBody);
			res.status(response.status).headers(responseHeaders).send(fastifyResponseBody);
		} catch (err) {
			logger.error(`Error parsing response body: ${err}`);
			//we have this fallback catch clause if someone wants to load the graphiql engine. This returns the default headers back
			response.headers?.forEach((value, key) => {
				res.header(key, value);
			});
			res.status(response.status);
			res.send(response.body);
		}

		return res;
	},
});

app.listen(
	{
		//set the port no of the server based on the input value
		port: portNo,
	},
	async err => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		yogaServer = await getYogaServer();

		console.log(`Server is running on http://localhost:${portNo}/graphql`);
	},
);
