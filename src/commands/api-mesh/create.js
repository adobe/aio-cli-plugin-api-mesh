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

const { initSdk, initRequestId, promptConfirm, importFiles } = require('../../helpers');
const logger = require('../../classes/logger');
const CONSTANTS = require('../../constants');
const {
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	getFilesInMeshConfig,
	envFileFlag,
	checkPlaceholders,
	readFileContents,
	validateAndInterpolateMesh,
} = require('../../utils');
const {
	createMesh,
	createAPIMeshCredentials,
	subscribeCredentialToMeshService,
} = require('../../lib/devConsole');

const { MULTITENANT_GRAPHQL_SERVER_BASE_URL } = CONSTANTS;

class CreateCommand extends Command {
	static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		json: jsonFlag,
		env: envFileFlag,
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(CreateCommand);

		if (!args.file) {
			this.error('Missing file path. Run aio api-mesh create --help for more info.');

			return;
		}

		const ignoreCache = await flags.ignoreCache;
		const autoConfirmAction = await flags.autoConfirmAction;
		const envFilePath = await flags.env;
		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

		//Input the mesh data from the input file
		let inputMeshData = await readFileContents(args.file, this, 'mesh');

		let data;

		if (checkPlaceholders(inputMeshData)) {
			this.log('The provided mesh contains placeholders. Starting mesh interpolation process.');
			data = await validateAndInterpolateMesh(inputMeshData, envFilePath, this);
		} else {
			try {
				data = JSON.parse(inputMeshData);
			} catch (err) {
				this.log(err.message);
				this.error('Input mesh file is not a valid JSON. Please check the file provided.');
			}
		}

		let filesList = [];

		try {
			filesList = getFilesInMeshConfig(data, args.file);
		} catch (err) {
			this.log(err.message);
			this.error('Input mesh config is not valid.');
		}

		// if local files are present, import them in files array in meshConfig
		if (filesList.length) {
			try {
				data = await importFiles(data, filesList, args.file, flags.autoConfirmAction);
			} catch (err) {
				this.log(err.message);
				this.error(
					'Unable to import the files in the mesh config. Please check the file and try again.',
				);
			}
		}

		let shouldContinue = true;

		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(`Are you sure you want to create a mesh?`);
		}

		if (shouldContinue) {
			try {
				const mesh = await createMesh(imsOrgId, projectId, workspaceId, data);

				let sdkList = [];

				if (mesh) {
					this.log(
						'******************************************************************************************************',
					);
					this.log(
						'Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s',
						mesh.meshId,
					);
					this.log('To check the status of your mesh, run:');
					this.log('aio api-mesh:status');
					this.log(
						'******************************************************************************************************',
					);

					// create API key credential
					const adobeIdIntegrationsForWorkspace = await createAPIMeshCredentials(
						imsOrgId,
						projectId,
						workspaceId,
					);

					if (adobeIdIntegrationsForWorkspace) {
						this.log('Successfully created API Key %s', adobeIdIntegrationsForWorkspace.apiKey);
						// subscribe the credential to API mesh service
						sdkList = await subscribeCredentialToMeshService(
							imsOrgId,
							projectId,
							workspaceId,
							adobeIdIntegrationsForWorkspace.id,
						);

						if (sdkList) {
							this.log(
								'Successfully subscribed API Key %s to API Mesh service',
								adobeIdIntegrationsForWorkspace.apiKey,
							);

							this.log(
								'Mesh Endpoint: %s\n',
								`${MULTITENANT_GRAPHQL_SERVER_BASE_URL}/${mesh.meshId}/graphql?api_key=${adobeIdIntegrationsForWorkspace.apiKey}`,
							);
						} else {
							this.log(
								'Unable to subscribe API Key %s to API Mesh service',
								adobeIdIntegrationsForWorkspace.apiKey,
							);
						}
					} else {
						this.log('Unable to create API Key');
					}
					// Do not remove or rename return values.
					// Template adobe/generator-app-api-mesh relies on "mesh" & "adobeIdIntegrationsForWorkspace" obj structure
					return {
						adobeIdIntegrationsForWorkspace,
						sdkList,
						mesh,
					};
				} else {
					this.error(`Unable to create a mesh. Please try again. RequestId: ${global.requestId}`, {
						exit: false,
					});
				}
			} catch (error) {
				this.log(error.message);

				this.error(
					`Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.log('Create cancelled');

			return 'Create cancelled';
		}
	}
}

CreateCommand.description = 'Create a mesh with the given config.';

module.exports = CreateCommand;
