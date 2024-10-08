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
const chalk = require('chalk');

const logger = require('../../classes/logger');
const { initSdk, initRequestId } = require('../../helpers');
const { ignoreCacheFlag } = require('../../utils');
const { describeMesh } = require('../../lib/devConsole');
const { buildMeshUrl, buildEdgeMeshUrl } = require('../../urlBuilder');

require('dotenv').config();

class DescribeCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
	};

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(DescribeCommand);
		const ignoreCache = await flags.ignoreCache;
		const { imsOrgId, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		try {
			const meshDetails = await describeMesh(imsOrgId, projectId, workspaceId, workspaceName);

			if (meshDetails) {
				const { meshId, apiKey } = meshDetails;

				if (meshId) {
					const meshUrl = await buildMeshUrl(
						imsOrgId,
						projectId,
						workspaceId,
						workspaceName,
						meshId,
						apiKey,
					);

					this.log('Successfully retrieved mesh details \n');
					this.log('Org ID: %s', imsOrgId);
					this.log('Project ID: %s', projectId);
					this.log('Workspace ID: %s', workspaceId);
					this.log('Mesh ID: %s', meshId);

					const edgeMeshUrl = buildEdgeMeshUrl(meshId, workspaceName);
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
					this.log(
						chalk.bgYellow(
							'Update your mesh before using the edge mesh endpoint.\nYou can validate your edge mesh status using the aio api-mesh status command.',
						),
					);
					return meshDetails;
				} else {
					logger.error(
						`Unable to get mesh details. Please check the details and try again. RequestId: ${global.requestId}`,
						{ exit: false },
					);
				}
			} else {
				throw new Error(`Unable to get mesh details.`);
			}
		} catch (error) {
			this.error(
				`${
					error.message || 'Unable to get mesh details.'
				} Please check the details and try again. If the error persists please contact support. RequestId: ${
					global.requestId
				}`,
			);
		}
	}
}

DescribeCommand.description = 'Get details of a mesh';

module.exports = DescribeCommand;
