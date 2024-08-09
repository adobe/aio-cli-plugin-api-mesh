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
const chalk = require('chalk');
const { initSdk, initRequestId, promptConfirm, importFiles } = require('../../helpers');
const logger = require('../../classes/logger');
const {
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	getFilesInMeshConfig,
	envFileFlag,
	secretsFlag,
	checkPlaceholders,
	readFileContents,
	validateAndInterpolateMesh,
	interpolateSecrets,
	validateSecretsFile,
	encryptSecrets,
} = require('../../utils');
const { createMesh, getPublicEncryptionKey } = require('../../lib/devConsole');
const { buildEdgeMeshUrl, buildMeshUrl } = require('../../urlBuilder');

class CreateCommand extends Command {
	static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		json: jsonFlag,
		env: envFileFlag,
		secrets: secretsFlag,
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
		const secretsFilePath = await flags.secrets;
		const {
			imsOrgId,
			imsOrgCode,
			projectId,
			workspaceId,
			workspaceName,
			orgName,
			projectName,
		} = await initSdk({
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

		// if secrets is present, include that in data.secrets
		if (secretsFilePath) {
			try {
				await validateSecretsFile(secretsFilePath);
				const secretsData = await interpolateSecrets(secretsFilePath, this);
				const publicKey = await getPublicEncryptionKey(imsOrgCode);
				const encryptedSecrets = await encryptSecrets(publicKey, secretsData);
				data.secrets = encryptedSecrets;
			} catch (err) {
				this.log(err.message);
				this.error('Unable to import secrets. Please check the file and try again.');
			}
		}

		let shouldContinue = true;

		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(`Are you sure you want to create a mesh?`);
		}

		if (shouldContinue) {
			try {
				const { mesh, apiKey, sdkList } = await createMesh(
					imsOrgId,
					projectId,
					workspaceId,
					workspaceName,
					orgName,
					projectName,
					data,
				);

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

					if (apiKey) {
						this.log('Successfully created API Key %s', apiKey);

						if (sdkList) {
							this.log('Successfully subscribed API Key %s to API Mesh service', apiKey);

							const meshUrl = await buildMeshUrl(
								imsOrgId,
								projectId,
								workspaceId,
								workspaceName,
								mesh.meshId,
								apiKey,
							);

							const edgeMeshUrl = buildEdgeMeshUrl(mesh.meshId, workspaceName);
							this.log(
								chalk.bgYellow(
									`\nAPI Mesh now runs at the edge and legacy mesh URLs will be deprecated.\nUse the following link to find more information on how to migrate your mesh:`,
								),
							);
							this.log(
								chalk.underline.blue(
									'https://developer.adobe.com/graphql-mesh-gateway/mesh/release/migration\n',
								),
							);
							this.log('Legacy Mesh Endpoint: %s', meshUrl);
							this.log(chalk.bold('Edge Mesh Endpoint: %s\n'), edgeMeshUrl);
						} else {
							this.log('Unable to subscribe API Key %s to API Mesh service', apiKey);
						}
					} else {
						this.log('Unable to create API Key');
					}
					// When renaming the return values, make sure to make necessary changes to
					// template adobe/generator-app-api-mesh since it relies on "mesh" & "apiKey"
					return {
						apiKey,
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
