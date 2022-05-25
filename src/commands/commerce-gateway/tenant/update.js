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
const logger = require('../../../classes/logger');
const { initSdk, initRequestId } = require('../../../helpers');

class UpdateCommand extends Command {
	static args = [{ name: 'meshId' }, { name: 'file' }];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args } = this.parse(UpdateCommand);

		const { schemaServiceClient, imsOrgCode, projectId, workspaceId } = await initSdk();
		let data;

		try {
			data = JSON.parse(await readFile(args.file, 'utf8'));
		} catch (error) {
			logger.error(error);

			this.error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			);
		}

		try {
			const response = await schemaServiceClient.updateMesh(
				imsOrgCode,
				projectId,
				workspaceId,
				args.meshId,
				data,
			);

			if (response) {
				this.log('Successfully updated the mesh with the id: %s', args.meshId);

				return response;
			} else {
				this.error(`Unable to update the mesh with the id: ${args.meshId}`);
			}
		} catch (error) {
			this.log(error.message);

			this.error(
				`Unable to update the mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
			);
		}
	}
}

UpdateCommand.description = 'Update a mesh with the given config.';

module.exports = UpdateCommand;
