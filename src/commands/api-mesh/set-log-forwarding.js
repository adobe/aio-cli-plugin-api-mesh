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
const {
	initSdk,
	initRequestId,
	promptConfirm,
	promptSelect,
	promptInput,
	promptInputSecret,
} = require('../../helpers');
const logger = require('../../classes/logger');
const { ignoreCacheFlag, autoConfirmActionFlag, jsonFlag } = require('../../utils');
const { setLogForwarding, getMeshId } = require('../../lib/devConsole');

class SetLogForwardingCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		json: jsonFlag,
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(SetLogForwardingCommand);

		const ignoreCache = await flags.ignoreCache;
		const autoConfirmAction = await flags.autoConfirmAction;
		const { imsOrgId, imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		// For MVP, only New Relic is supported
		const destinations = ['newrelic'];

		let meshId = null;
		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, meshId);
			if (!meshId) {
				throw new Error('MeshIdNotFound');
			}
		} catch (error) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		// Prompt for destination
		let destination = await promptSelect('Select log forwarding destination:', destinations);
		if (!destination) {
			this.error('Destination is required');
			return;
		}

		// Prompt for base URI
		let baseUri = await promptInput('Enter base URI:');
		if (!baseUri) {
			this.error('Base URI is required');
			return;
		}

		// Validate base URI
		if (!baseUri.startsWith('https://')) {
			this.error('The URI value must include the protocol (https://)');
			return;
		}

		// Prompt for license key
		let licenseKey = await promptInputSecret('Enter New Relic license key:');
		if (!licenseKey) {
			this.error('License key is required');
			return;
		}

		if (licenseKey.length !== 40) {
			this.error(
				`License key has wrong format. Expected: 40 characters (received: ${licenseKey.length})`,
			);
			return;
		}

		let shouldContinue = true;

		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(
				`Are you sure you want to set log forwarding to New Relic?`,
			);
		}

		if (shouldContinue) {
			try {
				await setLogForwarding(imsOrgCode, projectId, workspaceId, {
					destination: 'newrelic',
					config: {
						baseUri,
						licenseKey,
					},
				});

				this.log('Log forwarding details set successfully.');

				return {
					success: true,
					destination: 'newrelic',
					imsOrgId,
					projectId,
					workspaceId,
					workspaceName,
				};
			} catch (error) {
				this.log(error.message);
				this.error(
					`Failed to set log forwarding details. Please try again. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.log('set-log-forwarding cancelled');
			return 'set-log-forwarding cancelled';
		}
	}
}

SetLogForwardingCommand.description = `Set log forwarding destination for API mesh. 
- Select a log forwarding destination: Choose from available options ( example : newrelic).
- Enter the base URI: Provide the URI for the log forwarding service. Ensure it includes the protocol ( example : \`https://\`).
- Enter the license key: Provide the license key for authentication with the log forwarding service. The key must be 40 characters long.`;

module.exports = SetLogForwardingCommand;
