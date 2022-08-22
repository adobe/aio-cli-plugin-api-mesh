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

const logger = require('../../classes/logger');
const { initSdk, initRequestId } = require('../../helpers');
const CONSTANTS = require('../../constants');
const { ignoreCacheFlag } = require('../../utils');
const { describeMesh } = require('../../lib/devConsole');

require('dotenv').config();

const { MULTITENANT_GRAPHQL_SERVER_BASE_URL } = CONSTANTS;

class DescribeCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
	};

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(DescribeCommand);

		const ignoreCache = await flags.ignoreCache;

		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

		try {
			const meshDetails = await describeMesh(imsOrgId, projectId, workspaceId);

			if (meshDetails) {
				const { meshId, apiKey } = meshDetails;

				if (meshId) {
					this.log('Successfully retrieved mesh details \n');
					this.log('Org ID: %s', imsOrgId);
					this.log('Project ID: %s', projectId);
					this.log('Workspace ID: %s', workspaceId);
					this.log('Mesh ID: %s', meshId);

					if (apiKey) {
						this.log('API Key: %s', apiKey);
						this.log(
							'Mesh Endpoint: %s\n',
							`${MULTITENANT_GRAPHQL_SERVER_BASE_URL}/${meshId}/graphql?api_key=${apiKey}`,
						);
					}

					return meshDetails;
				} else {
					this.error(
						`Unable to get mesh details. Please check the details and try again. RequestId: ${global.requestId}`,
						{ exit: false },
					);
				}
			} else {
				throw new Error(`Unable to get mesh details`);
			}
		} catch (error) {
			this.log(error.message);

			this.error(
				`Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
			);
		}
	}
}

DescribeCommand.description = 'Get details of a mesh';

module.exports = DescribeCommand;
