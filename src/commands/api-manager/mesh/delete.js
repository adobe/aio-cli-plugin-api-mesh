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
const logger = require('../../../classes/logger');
const { initSdk, initRequestId } = require('../../../helpers');

require('dotenv').config();

class DeleteCommand extends Command {
	static args = [{ name: 'meshId' }];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args } = this.parse(DeleteCommand);

		const { schemaServiceClient, imsOrgCode, projectId, workspaceId } = await initSdk();

		try {
			const response = await schemaServiceClient.deleteMesh(
				imsOrgCode,
				projectId,
				workspaceId,
				args.meshId,
			);

			this.log('Successfully deleted mesh %s', args.meshId);

			return response;
		} catch (error) {
			this.log(error.message);

			this.error(
				`Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
			);
		}
	}
}

DeleteCommand.description = 'Delete the config of a given mesh';

module.exports = DeleteCommand;
