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

const Config = require('@adobe/aio-lib-core-config');
const { getToken, context } = require('@adobe/aio-lib-ims');
const { CLI } = require('@adobe/aio-lib-ims/src/context');
const fs = require('fs');
const libConsoleCLI = require('@adobe/aio-cli-lib-console');
const { SchemaServiceClient } = require('./classes/SchemaServiceClient');
const { getCliEnv } = require('@adobe/aio-lib-env');
const logger = require('../src/classes/logger');
const aioConsoleLogger = require('@adobe/aio-lib-core-logging')(
	'@adobe/aio-cli-plugin-commerce-admin',
	{ provider: 'debug' },
);
const CONSOLE_CONFIG_KEYS = {
	CONSOLE: 'console',
	ORG: 'org',
};
const CONSOLE_API_KEYS = {
	prod: 'aio-cli-console-auth',
	stage: 'aio-cli-console-auth-stage',
};

/**
 * @returns {any} Returns a config object or null
 */
async function getCommerceAdminConfig() {
	const configFile = Config.get('aio-cli-plugin-commerce-admin');
	try {
		const data = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8', flag: 'r' }));
		return {
			baseUrl: data.baseUrl || 'https://commerce.adobe.io',
			accessToken: (await getLibConsoleCLI()).accessToken,
			apiKey: data.apiKey,
		};
	} catch (error) {
		return null;
	}
}

/**
 * @returns {string} Returns organizations the user belongs to
 */
async function getAuthorizedOrganizations() {
	const { consoleCLI } = await getLibConsoleCLI();
	aioConsoleLogger.debug('Get the selected organization');
	const key = CONSOLE_CONFIG_KEYS.ORG;
	this.configOrgCode = Config.get(`${CONSOLE_CONFIG_KEYS.CONSOLE}.${key}`);
	if (!this.configOrgCode) {
		const organizations = await consoleCLI.getOrganizations();
		const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations);
		aioConsoleLogger.debug('Set the console config');
		Config.set(`${CONSOLE_CONFIG_KEYS.CONSOLE}.${key}`, {
			id: selectedOrg.id,
			code: selectedOrg.code,
			name: selectedOrg.name,
		});
		this.imsOrgCode = selectedOrg.code;
		return { imsOrgCode: this.imsOrgCode };
	} else {
		logger.info(`Selecting your organization as: ${this.configOrgCode.name}`);
		return { imsOrgCode: this.configOrgCode.code };
	}
}
/**
 * @private
 */
async function getLibConsoleCLI() {
	await context.setCli({ 'cli.bare-output': true }, false);
	const clientEnv = getCliEnv();
	this.accessToken = await getToken(CLI);
	this.consoleCLI = await libConsoleCLI.init({
		accessToken: this.accessToken,
		apiKey: CONSOLE_API_KEYS[clientEnv],
		env: clientEnv,
	});
	return { consoleCLI: this.consoleCLI, accessToken: this.accessToken };
}

/**
 * @returns {any} Returns an object with properties ready for consumption
 */
async function initSdk() {
	const { imsOrgCode } = await getAuthorizedOrganizations();
	logger.info('Initialized user login and the selected organization');
	const { baseUrl, accessToken, apiKey } = await getCommerceAdminConfig();
	const schemaServiceClient = new SchemaServiceClient();
	schemaServiceClient.init(baseUrl, accessToken, apiKey);
	return {
		schemaServiceClient: schemaServiceClient,
		imsOrgCode: imsOrgCode,
	};
}

module.exports = {
	getCommerceAdminConfig,
	initSdk,
};
