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

class UpdateCommand extends Command {
	static args = [{ name: 'meshId' }, { name: 'file' }];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args } = this.parse(UpdateCommand);

		if (!args.meshId || !args.file) {
			this.error('Missing required args. Run aio api-mesh update --help for more info.');

			return;
		}

		const { schemaServiceClient, imsOrgId, projectId, workspaceId } = await initSdk();
		let data;

		try {
			data = JSON.parse(await readFile(args.file, 'utf8'));
		} catch (error) {
			logger.error(error);

			this.log(error.message);
			this.error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			);
		}

		const shouldContinue = await promptConfirm(
			`Are you sure you want to update the mesh: ${args.meshId}?`,
		);

		if (shouldContinue) {
			try {
				const response = await schemaServiceClient.updateMesh(
					imsOrgId,
					projectId,
					workspaceId,
					args.meshId,
					data,
				);

				this.log('Successfully updated the mesh with the id: %s', args.meshId);

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
	}
}

UpdateCommand.description = 'Update a mesh with the given config.';

module.exports = UpdateCommand;
