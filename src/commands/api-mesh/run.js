/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { Command } = require('@oclif/core');
const {
	portNoFlag,
	debugFlag,
	inspectPortNoFlag,
	selectFlag,
	envFileFlag,
	secretsFlag,
	autoConfirmActionFlag,
	readFileContents,
	validateAndInterpolateMesh,
	checkPlaceholders,
	getFilesInMeshConfig,
	validateSecretsFile,
	interpolateSecrets,
} = require('../../utils');
const meshBuilder = require('@adobe-apimesh/mesh-builder');
const fs = require('fs');
const path = require('path');
const {
	initSdk,
	initRequestId,
	importFiles,
	setUpTenantFiles,
	writeSecretsFile,
} = require('../../helpers');
const logger = require('../../classes/logger');
const { getMeshId, getMeshArtifact } = require('../../lib/devConsole');
require('dotenv').config();
const { runServer } = require('../../server');
const { fixPlugins } = require('../../fixPlugins');

const { validateMesh, buildMesh, compileMesh } = meshBuilder.default;

class RunCommand extends Command {
	static summary = 'Run local development server';
	static description = 'Run a local development server that builds and compiles a mesh locally';

	static args = [
		{
			name: 'file',
			description: 'Mesh File',
		},
	];

	static flags = {
		port: portNoFlag,
		inspectPort: inspectPortNoFlag,
		debug: debugFlag,
		env: envFileFlag,
		autoConfirmAction: autoConfirmActionFlag,
		select: selectFlag,
		secrets: secretsFlag,
	};

	static enableJsonFlag = true;

	static examples = [];

	/**
	 * Validate the current working directory to ensure it is set up to run the command
	 * @returns {Promise<void>}
	 * @throws {Error} when project is not set up correctly
	 */
	async validateCwd() {
		//Ensure that current directory includes package.json
		if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
			throw new Error(
				'`aio api-mesh run` cannot be executed because there is no package.json file in the current directory. Use `aio api-mesh init` to set up a package.',
			);
		}
	}

	/**
	 * Handle remote mesh artifact
	 * @returns {Promise<string>} Mesh identifier
	 * @throws {Error} when failure retrieving remote mesh artifact
	 */
	async handleRemoteMeshArtifact() {
		const { imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({});

		// Get the mesh identifier for the workspace
		let meshId;
		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, workspaceName);
		} catch (err) {
			throw new Error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		try {
			await getMeshArtifact(imsOrgCode, projectId, workspaceId, workspaceName, meshId);
		} catch (err) {
			throw new Error(
				`Unable to retrieve mesh. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		try {
			await setUpTenantFiles(meshId);
		} catch (err) {
			throw new Error('Failed to install downloaded mesh');
		}

		this.log('Successfully downloaded mesh');

		return meshId;
	}

	/**
	 * Handle local mesh configuration
	 * @param args {unknown} Arguments
	 * @param flags {unknown} Flags
	 * @returns {Promise<string>}
	 * @throws {Error} when failure building local mesh artifact
	 */
	async handleLocalMeshConfig(args, flags) {
		// TODO: Let OCLIF handle conditional validation of this flag arg
		if (!args.file) {
			throw new Error('Missing file path. Run aio api-mesh run --help for more info.');
		}

		const envFilePath = await flags.env;

		//Read the mesh input file
		let inputMeshData = await readFileContents(args.file, this, 'mesh');
		let data;

		// TODO: Should we check for secrets in use when no secrets file provided?
		if (checkPlaceholders(inputMeshData)) {
			this.log('The provided mesh contains placeholders. Starting mesh interpolation process.');
			data = await validateAndInterpolateMesh(inputMeshData, envFilePath, this);
		} else {
			try {
				data = JSON.parse(inputMeshData);
			} catch (err) {
				this.log(err.message);
				throw new Error('Input mesh file is not a valid JSON. Please check the file provided.');
			}
		}

		let filesList = [];

		try {
			filesList = getFilesInMeshConfig(data, args.file);
		} catch (err) {
			this.log(err.message);
			throw new Error('Input mesh config is not valid.');
		}

		// if local files are present, import them in files array in meshConfig
		if (filesList.length) {
			try {
				// minification of js will not be done for run command if debugging is enabled
				data = await importFiles(data, filesList, args.file, flags.autoConfirmAction, !flags.debug);
			} catch (err) {
				this.log(err.message);
				throw new Error(
					'Unable to import the files in the mesh config. Please check the file and try again.',
				);
			}
		}

		//Generating unique mesh id
		const meshId = 'testMesh';

		await validateMesh(data.meshConfig);
		await buildMesh(meshId, data.meshConfig);
		await compileMesh(meshId);

		return meshId;
	}

	getPort(env, flags) {
		let value;
		const envVar = env.PORT;
		if (envVar) {
			value = this.parseInt(envVar, 'PORT value in the .env file is not a valid integer');
		}
		//To set the port number as the provided value in the command
		if (flags.port) {
			value = flags.port;
		}
		return value;
	}

	getInspectPort(env, flags) {
		let value;
		const envVar = env.INSPECT_PORT;
		if (envVar) {
			value = this.parseInt(envVar, 'INSPECT_PORT value in the .env file is not a valid integer');
		}
		//To set the port number as the provided value in the command
		if (flags.inspectPort) {
			value = flags.inspectPort;
		}
		return value;
	}

	/**
	 * Parse integer from string
	 * @param value {string} String value
	 * @param errorMessage {string?} Optional error message when parsing fails
	 * @returns {number}
	 * @throws {Error} when value is not a valid integer
	 */
	parseInt(value, errorMessage) {
		const int = parseInt(value);
		if (isNaN(int) || !Number.isInteger(int)) {
			throw new Error(errorMessage || `Value is not a valid integer`);
		}
		return int;
	}

	/**
	 * Handle secrets feature
	 * @param secretsFilePath {string} File path to secrets
	 * @param meshId {string} Mesh identifier
	 * @returns {Promise<void>}
	 */
	async handleSecretsFeature(secretsFilePath, meshId) {
		if (secretsFilePath) {
			try {
				await validateSecretsFile(secretsFilePath);
				const stringifiedSecrets = await interpolateSecrets(secretsFilePath, this);
				await writeSecretsFile(stringifiedSecrets, meshId);
			} catch (error) {
				this.log(error.message);
				this.error('Unable to import secrets. Please check the file and try again.');
			}
		}
	}

	async run() {
		try {
			await initRequestId();
			logger.info(`RequestId: ${global.requestId}`);

			const { args, flags } = await this.parse(RunCommand);
			await this.validateCwd();

			const port = this.getPort(process.env, flags);
			const inspectPort = this.getInspectPort(process.env, flags);

			// Use remote or local mesh artifact
			let meshId;
			if (flags.select) {
				meshId = await this.handleRemoteMeshArtifact();
			} else {
				meshId = await this.handleLocalMeshConfig(args, flags);
			}

			//secrets management
			const secretsFilePath = await flags.secrets;
			if (secretsFilePath) {
				await this.handleSecretsFeature(secretsFilePath, meshId);
			}

			// TODO: Review copy to ensure files can be debugged
			await this.copyMeshContent(meshId);

			const worker = await runServer(this, port, flags.debug, inspectPort);
			if (flags.debug) {
				this.log(`Debugging enabled on inspect port: ${worker.inspectPort}`);
			}
		} catch (error) {
			this.error(error.message);
		}
	}

	async copyMeshContent(meshId) {
		// Remove mesh artifact directory if exists
		if (fs.existsSync('.mesh')) {
			fs.rmSync('.mesh', { recursive: true });
		}
		// Remove tenant files directory if exists
		if (fs.existsSync('tenantFiles')) {
			fs.rmSync('tenantFiles', { recursive: true });
		}
		// Move built mesh artifact to expect directory
		fs.renameSync(`mesh-artifact/${meshId}`, '.mesh');

		// Move built tenant files if exists
		if (fs.existsSync('mesh-artifact/tenantFiles')) {
			// Tenant files included in the bundle for runtime/dynamic imports
			fs.cpSync('mesh-artifact/tenantFiles', '.mesh/tenantFiles', { recursive: true });
			fs.renameSync('mesh-artifact/tenantFiles', 'tenantFiles');
		}

		await fixPlugins('.mesh/index.js');

		if (fs.existsSync(`${__dirname}/../../../.mesh`)) {
			fs.rmSync(`${__dirname}/../../../.mesh`, { recursive: true });
		}
		fs.cpSync('.mesh', `${__dirname}/../../../.mesh`, { recursive: true });
	}
}

module.exports = RunCommand;
