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
const { writeFile } = require('fs/promises');
const logger = require('../../../classes/logger');
const { initSdk, initRequestId } = require('../../../helpers');

require('dotenv').config();

class GetCommand extends Command {
	static args = [{ name: 'meshId' }, { name: 'file' }];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args } = this.parse(GetCommand);

		const { schemaServiceClient, imsOrgCode, projectId, workspaceId } = await initSdk();

		try {
			const mesh = await schemaServiceClient.getMesh(
				imsOrgCode,
				projectId,
				workspaceId,
				args.meshId,
			);

			if (mesh) {
				this.log('Successfully retrieved mesh %s', JSON.stringify(mesh, null, 2));

				if (args.file) {
					try {
						await writeFile(args.file, JSON.stringify(mesh, null, 2));

						this.log('Successfully wrote mesh to file %s', args.file);
					} catch (error) {
						this.log('Unable to write mesh to file %s', args.file);

						logger.error(error);
					}
				}

				return mesh;
			} else {
				this.error(`Unable to get mesh with the ID ${mesh.meshId}`);
			}
		} catch (error) {
			this.log(error.message);

			this.error(
				`Unable to get mesh. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
			);
		}
	}
}

GetCommand.description = 'Get the config of a given mesh';

module.exports = GetCommand;
