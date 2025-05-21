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
const { initSdk, initRequestId } = require('../../../../../helpers');
const logger = require('../../../../../classes/logger');
const { ignoreCacheFlag, jsonFlag } = require('../../../../../utils');
const { getLogForwarding, getMeshId } = require('../../../../../lib/smsClient');

class GetLogForwardingCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		json: jsonFlag,
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(GetLogForwardingCommand);

		const ignoreCache = await flags.ignoreCache;

		const { imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.log(err.message);
			this.error(
				`Unable to get mesh ID. Check the details and try again. RequestId: ${global.requestId}`,
			);
		}
		// mesh could not be found
		if (!meshId) {
			this.error(
				`Unable to get meshId. No mesh found for Org(${imsOrgCode}) -> Project(${projectId}) -> Workspace(${workspaceId}). Check the details and try again.`,
			);
		}
		try {
			const response = await getLogForwarding(imsOrgCode, projectId, workspaceId, meshId);
			if (response && response.data) {
				this.log(
					'Successfully retrieved log forwarding details: \n',
					JSON.stringify(response.data, null, 2),
				);
				return { imsOrgCode, projectId, workspaceId, workspaceName };
			} else {
				this.error(
					`Unable to get log forwarding details. Try again. RequestId: ${global.requestId}`,
				);
				return;
			}
		} catch (error) {
			this.log(error.message);
			this.error(`Failed to get log forwarding details. Try again. RequestId: ${global.requestId}`);
		}
	}
}

GetLogForwardingCommand.description = `Get log forwarding details and error logs for a given mesh.

The 'log-forwarding' command includes the following options:
- log-forwarding         : Retrieve log forwarding details for a given mesh.
- log-forwarding:errors  : Download log forwarding error logs for a selected time period.`;

module.exports = GetLogForwardingCommand;
