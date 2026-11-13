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
} = require('../../../../helpers');
const logger = require('../../../../classes/logger');
const {
	ignoreCacheFlag,
	autoConfirmActionFlag,
	jsonFlag,
	destinations,
	LogForwardingKeys,
	encryptSecrets,
} = require('../../../../utils');
const {
	setLogForwarding,
	getMeshId,
	getPublicEncryptionKey,
} = require('../../../../lib/smsClient');

const OTEL_PROTOCOL = 'http/protobuf';
const ENTRA_SCOPE = 'https://monitor.azure.com/.default';
const OTEL_AUTH_CHOICES = {
	'Static headers': 'staticHeaders',
	'Microsoft Entra client credentials': 'entra',
};
const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const RESERVED_HEADERS = new Set([
	'connection',
	'content-length',
	'content-type',
	'host',
	'transfer-encoding',
]);
const ENTRA_TENANT_PATTERN = /^[0-9A-Za-z](?:[0-9A-Za-z.-]*[0-9A-Za-z])?$/;
const ENTRA_CLIENT_ID_PATTERN = /^[0-9A-Fa-f]{8}-(?:[0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/;
const OTEL_ENDPOINT_PATTERN = /^https:\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?::(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?(?:\/[^\s#]*)?$/;
const hasControlCharacters = value =>
	[...value].some(character => {
		const codePoint = character.codePointAt(0);
		return codePoint <= 31 || codePoint === 127;
	});

class SetLogForwardingCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		json: jsonFlag,
	};

	static enableJsonFlag = true;

	static usage = 'api-mesh:config:set:log-forwarding';

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
				// Get publicKey for encryption
				const publicKey = await getPublicEncryptionKey(imsOrgCode);
				if (!publicKey) {
					this.error(
						`Unable to set log forwarding details. Unable to get public key. Try again. RequestId: ${global.requestId}`,
					);
				}
				destinationConfig = await this.encryptDestinationSecrets(destinationConfig, publicKey);
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
						`Unable to set log forwarding details. Try again. RequestId: ${global.requestId}`,
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
		if (destinationConfig.name === 'otel') {
			return this.inputAndValidateOtelConfig();
		}
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

	async inputAndValidateOtelConfig() {
		const endpoint = await promptInput('Enter OTLP HTTPS endpoint:');
		this.validateOtelEndpoint(endpoint);

		const authChoice = await promptSelect(
			'Select OTLP authentication type:',
			Object.keys(OTEL_AUTH_CHOICES),
		);
		const authType = OTEL_AUTH_CHOICES[authChoice];
		if (!authType) {
			throw new Error('OTLP authentication type is required');
		}

		const auth =
			authType === 'staticHeaders'
				? await this.inputAndValidateStaticHeaders()
				: await this.inputAndValidateEntra();

		return {
			destination: 'otel',
			config: {
				endpoint,
				protocol: OTEL_PROTOCOL,
				auth,
			},
		};
	}

	async inputAndValidateStaticHeaders() {
		const headers = [];
		const headerNames = new Set();
		let addAnother = true;

		while (addAnother) {
			const name = await promptInput('Enter static header name:');
			const normalizedName = this.validateStaticHeaderName(name, headerNames);
			const value = await promptInputSecret(`Enter value for ${name}:`);
			if (!value || hasControlCharacters(value)) {
				throw new Error('Static header value is required and must not contain control characters');
			}
			headers.push({ name, value });
			headerNames.add(normalizedName);
			addAnother = await promptConfirm('Add another static header?');
		}

		return { type: 'staticHeaders', headers };
	}

	async inputAndValidateEntra() {
		const tenantId = await promptInput('Enter Microsoft Entra tenant ID:');
		if (!ENTRA_TENANT_PATTERN.test(tenantId)) {
			throw new Error('Microsoft Entra tenant ID is invalid');
		}

		const clientId = await promptInput('Enter Microsoft Entra client ID:');
		if (!ENTRA_CLIENT_ID_PATTERN.test(clientId)) {
			throw new Error('Microsoft Entra client ID must be a UUID');
		}

		const clientSecret = await promptInputSecret('Enter Microsoft Entra client secret:');
		if (!clientSecret || hasControlCharacters(clientSecret)) {
			throw new Error(
				'Microsoft Entra client secret is required and must not contain control characters',
			);
		}

		return {
			type: 'entra',
			tenantId,
			clientId,
			clientSecret,
			scope: ENTRA_SCOPE,
		};
	}

	validateOtelEndpoint(endpoint) {
		if (
			typeof endpoint !== 'string' ||
			hasControlCharacters(endpoint) ||
			!OTEL_ENDPOINT_PATTERN.test(endpoint)
		) {
			throw new Error('OTLP endpoint must be a valid HTTPS URL');
		}
	}

	validateStaticHeaderName(name, headerNames) {
		const normalizedName = typeof name === 'string' ? name.toLowerCase() : '';
		if (
			!name ||
			!HEADER_NAME_PATTERN.test(name) ||
			RESERVED_HEADERS.has(normalizedName) ||
			headerNames.has(normalizedName)
		) {
			throw new Error('Static header name is invalid or duplicated');
		}
		return normalizedName;
	}

	async encryptDestinationSecrets(destinationConfig, publicKey) {
		if (destinationConfig.destination === 'newrelic') {
			const keyToEncrypt = [LogForwardingKeys.LICENSE_KEY, LogForwardingKeys.HEC_TOKEN].find(
				key => key in destinationConfig.config,
			);
			if (!keyToEncrypt) {
				throw new Error('No valid key to encrypt found in the configuration');
			}
			return {
				...destinationConfig,
				config: {
					...destinationConfig.config,
					[keyToEncrypt]: await encryptSecrets(publicKey, destinationConfig.config[keyToEncrypt]),
				},
			};
		}

		if (destinationConfig.destination === 'otel') {
			const { auth } = destinationConfig.config;
			if (auth.type === 'staticHeaders') {
				return {
					...destinationConfig,
					config: {
						...destinationConfig.config,
						auth: {
							...auth,
							headers: await Promise.all(
								auth.headers.map(async header => ({
									...header,
									value: await encryptSecrets(publicKey, header.value),
								})),
							),
						},
					},
				};
			}
			return {
				...destinationConfig,
				config: {
					...destinationConfig.config,
					auth: {
						...auth,
						clientSecret: await encryptSecrets(publicKey, auth.clientSecret),
					},
				},
			};
		}

		throw new Error('No valid key to encrypt found in the configuration');
	}
}

SetLogForwardingCommand.description = `Sets the log forwarding destination for API mesh. 
- New Relic uses its HTTPS log API base URI and INGEST-LICENSE API key.
- OpenTelemetry uses an HTTPS OTLP/HTTP protobuf endpoint with static headers or Microsoft Entra client credentials.`;

module.exports = SetLogForwardingCommand;
