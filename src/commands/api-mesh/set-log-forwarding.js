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
const { ignoreCacheFlag, autoConfirmActionFlag, jsonFlag, destinations } = require('../../utils');
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

		let destinationConfig;
		try {
			destinationConfig = await this.inputAndValidateConfigs(destinations);
		} catch (error) {
			this.error(error.message);
			return;
		}
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

		let shouldContinue = true;

		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(
				`Are you sure you want to set log forwarding to ${destinationConfig.destination}?`,
			);
		}

		if (shouldContinue) {
			try {
				const response = await setLogForwarding(
					imsOrgCode,
					projectId,
					workspaceId,
					meshId,
					destinationConfig,
				);
				if (response && response.result) {
					this.log(`Log forwarding set successfully for ${meshId}`);
					return { destinationConfig, imsOrgCode, projectId, workspaceId, workspaceName };
				} else {
					this.error(
						`Unable to set log forwarding details. Please try again. RequestId: ${global.requestId}`,
					);
					return;
				}
			} catch (error) {
				this.log(error.message);
				this.error(
					`Failed to set log forwarding details. Try again. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.log('log-forwarding cancelled');
			return 'set-log-forwarding cancelled';
		}
	}

	async inputAndValidateConfigs(destinations) {
		// Prompt for destination
		const destinationKey = await promptSelect(
			'Select log forwarding destination:',
			Object.keys(destinations),
		);
		if (!destinationKey) {
			throw new Error('Destination is required');
		}

		const destinationConfig = destinations[destinationKey];
		const inputs = {};

		// For each input defined in the destination config, prompt and validate
		for (const inputConfig of destinationConfig.inputs) {
			// Prompt for input value (regular or secret based on config)
			const promptFn = inputConfig.isSecret ? promptInputSecret : promptInput;
			const value = await promptFn(inputConfig.promptMessage);

			// Validate the input
			if (inputConfig.validate) {
				inputConfig.validate(value);
			}

			// Store the validated input
			inputs[inputConfig.name] = value;
		}

		return {
			destination: destinationConfig.name,
			config: inputs,
		};
	}
}

SetLogForwardingCommand.description = `Sets the log forwarding destination for API mesh. 
- Select a log forwarding destination: Choose from available options ( example : newrelic).
- Enter the base URI: Provide the URI for the log forwarding service. Ensure it includes the protocol ( example : If the hosted region of New Relic account is U.S, the base URI can be 'https://log-api.newrelic.com/log/v1').
- Enter the license key - Provide the INGEST-LICENSE API key type.`;

module.exports = SetLogForwardingCommand;
