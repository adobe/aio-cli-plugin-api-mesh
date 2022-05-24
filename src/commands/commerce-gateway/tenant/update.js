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
		const { schemaServiceClient, imsOrgCode } = await initSdk();
		let data;
		try {
			data = JSON.parse(await readFile(args.file, 'utf8'));
		} catch (error) {
			logger.error(error);
			this.error('Unable to update the tenant with the given configuration');
		}

		/**
		 * Mock data
		 *
		 * To be implemented soon
		 */
		const projectId = 'test-project';
		const workspaceId = 'test-workspace';

		const tenant = await schemaServiceClient.updateTenant(
			imsOrgCode,
			projectId,
			workspaceId,
			args.meshId,
			data,
		);

		tenant
			? logger.info(`Successfully updated the tenant with the id: ${args.meshId}`)
			: logger.info(`Unable to update the tenant with the id: ${args.meshId}`);
		return tenant;
	}
}

UpdateCommand.description = 'Update a tenant with the given config.';

module.exports = UpdateCommand;
