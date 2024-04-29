const CONSTANTS = require('./constants');
const { getMesh } = require('./lib/devConsole');

const {
	MULTITENANT_GRAPHQL_SERVER_BASE_URL,
	EDGE_MESH_BASE_URL,
	EDGE_MESH_SANDBOX_BASE_URL,
} = CONSTANTS;

/**
 * Build the mesh url for the multitenant mesh.
 *
 * Gets the mesh details to checks for a custom domain in the case of a TI mesh.
 * @param imsOrgId
 * @param projectId
 * @param workspaceId
 * @param workspaceName
 * @param meshId
 * @param apiKey
 * @returns {Promise<string>}
 */
async function buildMeshUrl(imsOrgId, projectId, workspaceId, workspaceName, meshId, apiKey) {
	const { meshURL: customBaseUrl } = await getMesh(
		imsOrgId,
		projectId,
		workspaceId,
		workspaceName,
		meshId,
	);

	return customBaseUrl
		? `${customBaseUrl}/${meshId}/graphql`
		: `${MULTITENANT_GRAPHQL_SERVER_BASE_URL}/${meshId}/graphql${
				apiKey ? `?api_key=${apiKey}` : ''
		  }`;
}

/**
 * Builds the mesh url for the edge mesh.
 *
 * Uses the url for the appropriate Cloudflare namespace based on the console workspace name.
 * @param meshId
 * @param workspaceName
 * @returns {string}
 */
function buildEdgeMeshUrl(meshId, workspaceName) {
	let baseUrl;

	if (EDGE_MESH_BASE_URL.includes('stage')) {
		baseUrl = EDGE_MESH_BASE_URL;
	} else {
		baseUrl = workspaceName === 'Production' ? EDGE_MESH_BASE_URL : EDGE_MESH_SANDBOX_BASE_URL;
	}

	return `${baseUrl}/${meshId}/graphql`;
}

module.exports = { buildMeshUrl, buildEdgeMeshUrl };
