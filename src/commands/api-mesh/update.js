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

const { Command } = require('@oclif/command');
const { readFile } = require('fs/promises');

const logger = require('../../classes/logger');
const { initSdk, initRequestId, promptConfirm } = require('../../helpers');
const { ignoreCacheFlag, autoConfirmActionFlag, envFileFlag } = require('../../utils');
const { getMeshId, updateMesh } = require('../../lib/devConsole');
const meshInterpolation = require('../../meshInterpolation');

const dotenv = require('dotenv');

class UpdateCommand extends Command {
	static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		env: envFileFlag,
	};

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(UpdateCommand);

		if (!args.file) {
			this.error('Missing required args. Run aio api-mesh update --help for more info.');

			return;
		}

		const ignoreCache = await flags.ignoreCache;
		const autoConfirmAction = await flags.autoConfirmAction;
		const envFilePath=await flags.env;

		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

		let inputMeshData;

		//Input the mesh data from the input file
		try {
			inputMeshData = await readFile(args.file, 'utf8');
		} catch (error) {
			logger.error(error);

			this.log(error.message);
			this.error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			);
		}

		let meshId;

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		let data;

		if (envFilePath) {
			let envFileContent;

			//Read the environment file
			try {
				envFileContent = await readFile(envFilePath, 'utf8');
			} catch (error) {
				this.log(error.message);
				this.error('Unable to read the env file provided. Please check the file and try again.');
			}

			//Validate the env file
			const envFileValidity = meshInterpolation.validateEnvFileFormat(envFileContent);
			if (envFileValidity.valid) {
				//load env file into the process.env object
				meshInterpolation.clearEnv();

				//Added env at start of each environment variable
				const envObj = { env: dotenv.config({ path: envFilePath }).parsed };

				let {
					interpolationStatus,
					missingKeys,
					interpolatedMeshData,
				} = await meshInterpolation.interpolateMesh(inputMeshData, envObj);

				//De-duplicate the missing keys array
				missingKeys = missingKeys.filter(function (item, index, inputArray) {
					return inputArray.indexOf(item) == index;
				});

				if (interpolationStatus == 'failed') {
					this.error(
						'The mesh file cannot be interpolated due to missing keys : ' + missingKeys.toString(),
					);
				}

				try {
					data = JSON.parse(interpolatedMeshData);
				} catch (err) {
					this.log(err.message);
					this.log(interpolatedMeshData);
					this.error(
						'Interpolated mesh is not a valid JSON. Please check the generated json file.',
					);
				}
			} else {
				this.error(`Issue in ${envFilePath} file - ` + envFileValidity.error);
			}
		} else {
			try {
				data = JSON.parse(inputMeshData);
			} catch (err) {
				this.log(err.message);
				this.error('Input mesh file is not a valid JSON. Please check the input file provided.');
			}
		}

		if (meshId) {
			let shouldContinue = true;

			if (!autoConfirmAction) {
				shouldContinue = await promptConfirm(
					`Are you sure you want to update the mesh: ${meshId}?`,
				);
			}

			if (shouldContinue) {
				try {
					const response = await updateMesh(imsOrgId, projectId, workspaceId, meshId, data);

					this.log(
						'******************************************************************************************************',
					);
					this.log(
						'Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s',
						meshId,
					);
					this.log('To check the status of your mesh, run:');
					this.log('aio api-mesh:status');
					this.log(
						'******************************************************************************************************',
					);

					return response;
				} catch (error) {
					this.log(error.message);

					this.error(
						`Unable to update the mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
					);
				}
			} else {
				this.log('Update cancelled');

				return 'Update cancelled';
			}
		} else {
			this.error(
				`Unable to update. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again.`,
			);
		}
	}
}

UpdateCommand.description = 'Update a mesh with the given config.';

module.exports = UpdateCommand;
