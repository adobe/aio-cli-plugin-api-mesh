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
const { writeFile } = require('fs/promises');

const logger = require('../../classes/logger');
const { initSdk, initRequestId } = require('../../helpers');
const { ignoreCacheFlag, jsonFlag, rayIdFlag } = require('../../utils');
const { getMeshId, getMesh, fetchLogs, getLogsByRayId} = require('../../lib/devConsole');

require('dotenv').config();
class FetchLogsCommand extends Command {
	static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		json: jsonFlag,
		rayId: rayIdFlag
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(FetchLogsCommand);

		const ignoreCache = await flags.ignoreCache;
		const json = await flags.json;
		const rayId = await flags.rayId;

		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
			verbose: !json,
		});

		let meshId = null;

		//console.log('rayid', rayId);

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId, meshId);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}
		if (meshId) {
			try {
				const mesh = await getLogsByRayId(imsOrgId, projectId, workspaceId, meshId, rayId);

				//console.log(mesh)

				if (mesh) {
					this.log('Successfully retrieved mesh %s');
					//console.log(mesh);

					const result = Object.entries(mesh).map(([key, value]) => ({ [key]: value[0] }));

					const flattenedResult = result.reduce((acc, curr) => {
						const [key, value] = Object.entries(curr)[0];
						acc[key] = value;
						return acc;
					}, {});

					console.table([flattenedResult]);

					//console.table(result);
				} else {
					console.log(`Unable to get mesh with the ID ${meshId}. Please check the mesh ID and try again. RequestId: ${global.requestId}`);
				}

				

			} catch (error) {
				this.log(error.message);

				this.error(
					`Unable to get mesh. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.error(
				`Unable to get mesh config. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again.`,
				{ exit: false },
			);
		}
	}
}

FetchLogsCommand.description = 'Get the rayIds of a given mesh';

module.exports = FetchLogsCommand;
