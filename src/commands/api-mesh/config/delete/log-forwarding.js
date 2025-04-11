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
const logger = require('../../../../classes/logger');
const { initSdk, promptConfirm } = require('../../../../helpers');
const { ignoreCacheFlag, autoConfirmActionFlag } = require('../../../../utils');
const { deleteLogForwarding, getMeshId } = require('../../../../lib/smsClient');

class DeleteLogForwardingCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
	};

	async run() {
		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(DeleteLogForwardingCommand);

		const ignoreCache = await flags.ignoreCache;
		const autoConfirmAction = await flags.autoConfirmAction;

		const { imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		// mesh could not be found
		if (!meshId) {
			this.error(
				`Unable to delete log forwarding details. No mesh found for Org(${imsOrgCode}) -> Project(${projectId}) -> Workspace(${workspaceId}). Check the details and try again.`,
			);
		}

		let shouldContinue = true;

		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(
				`Are you sure you want to delete the log forwarding details for mesh: ${meshId}?`,
			);
		}

		if (shouldContinue) {
			try {
				await deleteLogForwarding(imsOrgCode, projectId, workspaceId, meshId);
				this.log('Successfully deleted log forwarding details');
			} catch (error) {
				this.log(error.message);
				this.error(
					`failed to delete log forwarding details. Try again. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.log('delete log-forwarding cancelled');
			return 'delete log-forwarding cancelled';
		}
	}
}

DeleteLogForwardingCommand.description = 'Delete log forwarding details for a given mesh';

module.exports = DeleteLogForwardingCommand;
