const CONSTANTS = require('./constants');

const { MESH_BASE_URL, MESH_SANDBOX_BASE_URL } = CONSTANTS;

/**
 * Builds the mesh url for the edge mesh.
 *
 * Uses the url for the appropriate Cloudflare namespace based on the console workspace name.
 * @param meshId
 * @param workspaceName
 * @returns {string}
 */
function buildMeshUrl(meshId, workspaceName) {
	let baseUrl;

	if (MESH_BASE_URL.includes('stage')) {
		baseUrl = MESH_BASE_URL;
	} else {
		baseUrl = workspaceName === 'Production' ? MESH_BASE_URL : MESH_SANDBOX_BASE_URL;
	}

	return `${baseUrl}/${meshId}/graphql`;
}

module.exports = { buildMeshUrl };
