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

class GetCommand extends Command {
	static args = [{ name: 'meshId' }];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args } = this.parse(GetCommand);
		const { schemaServiceClient, imsOrgCode } = await initSdk();

		/**
		 * Mock data
		 *
		 * To be implemented soon
		 */
		const projectId = 'test-project';
		const workspaceId = 'test-workspace';

		const mesh = await schemaServiceClient.getMesh(imsOrgCode, projectId, workspaceId, args.meshId);

		if (mesh) {
			logger.info(`Mesh: ${JSON.stringify(mesh)}`);

			this.log('Mesh config: %s', JSON.stringify(mesh, null, 2));
		} else {
			logger.info(`Mesh ${args.meshId} not found`);

			this.error(`Unable to get a mesh with the ID ${args.meshId}`);
		}

		return mesh;
	}
}

GetCommand.description = 'Get the config of a given mesh';

module.exports = GetCommand;
