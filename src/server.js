import { getMesh } from '@graphql-mesh/runtime';

import { KvStateApiImpl } from './state';

const { getCorsOptions } = require('./cors');
const { createYoga } = require('graphql-yoga');
const { GraphQLError } = require('graphql/error');

const { loadMeshSecrets, getSecretsHandler } = require('./secrets');
const useComplianceHeaders = require('./plugins/complianceHeaders');
const UseHttpDetailsExtensions = require('./plugins/httpDetailsExtensions');
const useSourceHeaders = require('@adobe/plugin-source-headers');
const { useDisableIntrospection } = require('@envelop/disable-introspection');

let meshInstance$;

async function buildMeshInstance(meshArtifacts, meshConfig) {
	const { getMeshOptions } = meshArtifacts;
	const options = await getMeshOptions();

	options.additionalEnvelopPlugins = (options.additionalEnvelopPlugins || []).concat(
		useComplianceHeaders(),
		UseHttpDetailsExtensions({
			// Get the details of responseConfig.includeHTTPDetails and store in Cache
			if: meshConfig.responseConfig?.includeHTTPDetails || false,
		}),
		useSourceHeaders(meshConfig),
	);

	if (meshConfig.disableIntrospection) {
		options.additionalEnvelopPlugins.push(useDisableIntrospection());
	}

	return getMesh(options).then(mesh => {
		const id = mesh.pubsub.subscribe('destroy', () => {
			meshInstance$ = undefined;
			mesh.pubsub.unsubscribe(id);
		});
		return mesh;
	});
}

async function getBuiltMesh(meshArtifacts, meshConfig) {
	if (meshInstance$ == null) {
		meshInstance$ = buildMeshInstance(meshArtifacts, meshConfig);
	}
	return meshInstance$;
}

const buildServer = async (loggerInstance, env, meshArtifacts, meshConfig) => {
	const { SECRETS } = env;
	const tenantMesh = await getBuiltMesh(meshArtifacts, meshConfig);
	const meshSecrets = loadMeshSecrets(loggerInstance, SECRETS);
	return await buildYogaServer(env, tenantMesh, meshConfig, meshSecrets);
};

async function buildYogaServer(env, tenantMesh, meshConfig, meshSecrets) {
	const stateApi = new KvStateApiImpl(env, meshConfig);
	const secretsProxy = new Proxy(meshSecrets, getSecretsHandler);
	return createYoga({
		plugins: tenantMesh.plugins,
		graphqlEndpoint: `/graphql`,
		cors: getCorsOptions(env, meshConfig),
		context: initialContext => ({
			...initialContext,
			secrets: secretsProxy,
			state: stateApi,
		}),
		maskedErrors: {
			maskError: maskError,
		},
		logging: 'debug',
	});
}

const maskError = error => {
	if (error instanceof GraphQLError && error.extensions?.http?.headers) {
		delete error.extensions.http.headers;
	}

	return error;
};

module.exports = { buildServer };
