import 'json-bigint-patch';

import { ServedTier, addServedHeader } from './served';
import { buildServer } from './server';
import { bindedlogger as logger } from './utils/logger';
import { getRequestId } from './utils/requestId';

let server;

export default {
	setServer(newServer) {
		server = newServer;
	},
	/**
	 * Fetch.
	 * @param request Request.
	 * @param env Environment.
	 * @param ctx Event context.
	 */
	async fetch(request, env, ctx) {
		const requestId = getRequestId(request);
		// Retrieve environment variables
		const { MESH_ID: meshId, LOG_LEVEL: logLevel } = env;
		const loggerInstance = logger({ logLevel, meshId, requestId });
		const meshArtifacts = await import('../.mesh');
		const meshConfig = await import('../.mesh/.meshrc.json');

		if (!server) {
			server = await this.buildAndCacheServer(env, loggerInstance, meshArtifacts, meshConfig);
		}

		loggerInstance.debug('WORKER HOT: Fetching via worker');
		const response = await server.fetch(request, ctx);
		addServedHeader(response, ServedTier.WORKER_HOT);
		return response;
	},
	/**
	 * Build and cache mesh instance/server in global variable.
	 * @param env Environment
	 * @param logger Logger
	 * @param meshArtifacts Mesh artifact
	 * @param meshConfig Mesh config
	 */
	async buildAndCacheServer(env, logger, meshArtifacts, meshConfig) {
		server = await buildServer(logger, env, meshArtifacts, meshConfig);
		return server;
	},
};
