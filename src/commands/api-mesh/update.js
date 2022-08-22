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
const { ignoreCacheFlag, autoConfirmActionFlag } = require('../../utils');
const { getMeshId, updateMesh } = require('../../lib/devConsole');

require('dotenv').config();

class UpdateCommand extends Command {
	static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
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

		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

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

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
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

					this.log('Successfully updated the mesh with the id: %s', meshId);

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
