/* eslint-disable no-console */
const fs = require('fs');
/**
 * Modifies `index.js` of a mesh artifact to mutate plugin references for edge compatibility. Current forces
 * `@graphql-mesh/plugin-http-details-extensions` to resolve to local fork instead.
 */
async function fixPlugins(meshArtifactPath) {
	try {
		console.log('Modifying mesh artifact to fix plugins for edge compatibility.');
		const data = fs.readFileSync(meshArtifactPath, 'utf8');
		const updatedData = data.replace(
			/@graphql-mesh\/plugin-http-details-extensions/g,
			'../src/plugins/httpDetailsExtensions',
		);
		fs.writeFileSync(meshArtifactPath, updatedData, 'utf8');
	} catch (err) {
		console.error(err);
	}
}

// Execute fixPlugins if run directly from CLI
if (require.main === module) {
	fixPlugins();
}

module.exports = {
	fixPlugins,
};
