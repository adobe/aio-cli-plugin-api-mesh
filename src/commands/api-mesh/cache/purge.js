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
const { initSdk, promptConfirm } = require('../../../helpers');
const {
	ignoreCacheFlag,
	autoConfirmActionFlag,
	cachePurgeAllActionFlag,
} = require('../../../utils');
const { getMeshId, cachePurge } = require('../../../lib/smsClient');

require('dotenv').config();

class CachePurgeCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		all: cachePurgeAllActionFlag,
	};

	async run() {
		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(CachePurgeCommand);

		const ignoreCache = await flags.ignoreCache;
		const autoConfirmAction = await flags.autoConfirmAction;

		const { imsOrgCode, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		if (!meshId) {
			this.error(
				`Unable to purge cache. No mesh found for Org(${imsOrgCode}) -> Project(${projectId}) -> Workspace(${workspaceId}). Check the details and try again.`,
			);
		}
		let shouldContinue = !!autoConfirmAction;
		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(`Cache will purge ALL data. Do you wish to continue?`);
		}
		if (!shouldContinue) {
			this.log('Cache purge cancelled');

			return 'Cache purge cancelled';
		}
		try {
			const cachePurgeResponse = await cachePurge(imsOrgCode, projectId, workspaceId, meshId);

			if (cachePurgeResponse) {
				this.log('Successfully purged cache for mesh %s', meshId);

				return cachePurgeResponse;
			} else {
				throw new Error(
					`Unable to purge cache. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} catch (error) {
			this.log(error.message);

			this.error(
				`Unable to purge cache. If the error persists please contact support. RequestId: ${global.requestId}`,
			);
		}
	}
}

CachePurgeCommand.description = 'Cache purge for a given mesh';

module.exports = CachePurgeCommand;
