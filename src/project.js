const { cpSync, existsSync, renameSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const fs = require('fs');
const { resolveOriginalSources } = require('./meshArtifact');

const BUILT_MESH_ARTIFACT_DIRECTORY = 'mesh-artifact';
const BUILT_MESH_TENANT_FILES_DIRECTORY = join(BUILT_MESH_ARTIFACT_DIRECTORY, 'tenantFiles');
const PACKAGED_MESH_DIR = '.mesh';
const PACKAGED_MESH_DIR_TENANT_FILES_DIRECTORY = join(PACKAGED_MESH_DIR, 'tenantFiles');
const PACKAGED_MESH_CLI_MIRROR_DIR = `${__dirname}/../${PACKAGED_MESH_DIR}`;
const TEMP_FILES_DIRECTORY = 'tempfiles';
const getBuiltMeshTenantDirectory = meshId => join(BUILT_MESH_ARTIFACT_DIRECTORY, meshId);

/**
 * Whether the mesh build artifact exists
 * @returns {boolean}
 */
const isMeshBuilt = () => {
	return fs.existsSync(BUILT_MESH_ARTIFACT_DIRECTORY);
};

const copyBuiltMeshToPackage = async builtMeshTenantDir => {
	if (!isMeshBuilt()) {
		throw new Error('Mesh build artifact "mesh-artifact" not found.');
	}

	// Reset packaged directories
	safeDelete(PACKAGED_MESH_DIR);
	safeDelete(PACKAGED_MESH_CLI_MIRROR_DIR);

	// Copy the built mesh to the packaged directory for in-project SDK
	safeRename(builtMeshTenantDir, PACKAGED_MESH_DIR);
	safeRename(BUILT_MESH_TENANT_FILES_DIRECTORY, PACKAGED_MESH_DIR_TENANT_FILES_DIRECTORY);

	// Copy the packaged mesh to the CLI mirror directory for local server
	safeCopy(PACKAGED_MESH_DIR, PACKAGED_MESH_CLI_MIRROR_DIR);
};

const safeDelete = path => {
	if (existsSync(path)) {
		rmSync(path, { recursive: true });
	}
};

const safeRename = (oldPath, newPath) => {
	if (existsSync(oldPath)) {
		renameSync(oldPath, newPath);
	}
};

const safeCopy = (source, destination) => {
	if (existsSync(source)) {
		cpSync(source, destination, { recursive: true });
	}
};

module.exports = {
	BUILT_MESH_ARTIFACT_DIRECTORY,
	safeDelete,
	copyBuiltMeshToPackage,
	resolveOriginalSources,
	TEMP_FILES_DIRECTORY,
	getBuiltMeshTenantDirectory,
};
