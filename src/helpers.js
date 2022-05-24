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
const { UUID } = require('./classes/UUID');
const aioConsoleLogger = require('@adobe/aio-lib-core-logging')(
	'@adobe/aio-cli-plugin-commerce-admin',
	{ provider: 'debug' },
);

const CONSOLE_API_KEYS = {
	prod: 'aio-cli-console-auth',
	stage: 'aio-cli-console-auth-stage',
};

/**
 * @returns {any} Returns a config object or null
 */
async function getCommerceAdminConfig() {
	const configFile = Config.get('aio-cli-plugin-commerce-admin');

	if (!configFile) {
		return {
			baseUrl: 'https://graph.adobe.io',
			accessToken: (await getLibConsoleCLI()).accessToken,
			apiKey: 'graphql-onboarding-io',
		};
	} else {
		try {
			if (!fs.existsSync(configFile)) {
				logger.error(
					`The config file does not exist. Please run the command: aio config:set aio-cli-plugin-commerce-admin <path_to_json_file> with a valid file.`,
				);

				throw new Error('Config file does not exist');
			}

			const data = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8', flag: 'r' }));

			if (!data.baseUrl || !data.apiKey) {
				logger.error('Invalid config file. Please check the file and try again.');

				throw new Error('Invalid config file. Please check the file and try again.');
			}

			return {
				baseUrl: data.baseUrl,
				accessToken: (await getLibConsoleCLI()).accessToken,
				apiKey: data.apiKey,
			};
		} catch (error) {
			logger.error(
				'Please run aio config set command to set the correct path to config json with valid baseUrl and apiKey',
			);

			throw new Error(error);
		}
	}
}

/**
 * @returns {string} Returns organizations the user belongs to
 */
async function getAuthorizedOrganizations() {
	const { consoleCLI } = await getLibConsoleCLI();

	aioConsoleLogger.debug('Get the selected organization');

	const consoleConfig = Config.get('console.org');

	if (!consoleConfig) {
		const organizations = await consoleCLI.getOrganizations();
		const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations);

		aioConsoleLogger.debug('Set the console config');

		Config.set('console.org', {
			id: selectedOrg.id,
			code: selectedOrg.code,
			name: selectedOrg.name,
		});

		return Object.assign({}, selectedOrg);
	} else {
		logger.info(`Selecting your organization as: ${consoleConfig.name}`);

		return Object.assign({}, consoleConfig);
	}
}

async function getProjects(imsOrgId, imsOrgTitle) {
	logger.info(`Initializing project selection for ${imsOrgId}`);

	const { consoleCLI } = await getLibConsoleCLI();

	const projects = await consoleCLI.getProjects(imsOrgId);
	if (projects.length !== 0) {
		const selectedProject = await consoleCLI.promptForSelectProject(projects);

		return selectedProject;
	} else {
		aioConsoleLogger.error(`No projects found for the selected organization: ${imsOrgTitle}`);
	}
}

async function getWorkspaces(orgId, projectId, imsOrgTitle, projectTitle) {
	logger.info(`Initializing workspace selection for ${orgId} / ${projectId}`);

	const { consoleCLI } = await getLibConsoleCLI();

	const workspaces = await consoleCLI.getWorkspaces(orgId, projectId);
	if (workspaces.length !== 0) {
		const selectedWorkspace = await consoleCLI.promptForSelectWorkspace(workspaces);

		return selectedWorkspace;
	} else {
		aioConsoleLogger.error(
			`No workspaces found for the selected organization: ${imsOrgTitle} and project: ${projectTitle}`,
		);
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
	const org = await getAuthorizedOrganizations();
	const project = await getProjects(org.id, org.name);
	const workspace = await getWorkspaces(org.id, project.id, org.name, project.title);

	aioConsoleLogger.log(
		`Initializing SDK for org: ${org.name}, project: ${project.title} and workspace: ${workspace.title}`,
	);

	logger.info('Initialized user login and the selected organization');

	const { baseUrl, accessToken, apiKey } = await getCommerceAdminConfig();

	const schemaServiceClient = new SchemaServiceClient();
	schemaServiceClient.init(baseUrl, accessToken, apiKey);

	return {
		schemaServiceClient: schemaServiceClient,
		imsOrgCode: org.code,
		projectId: project.id,
		workspaceId: workspace.id,
	};
}

/**
 * Generates a static global requestid for the lifecycle of this command request
 */
async function initRequestId() {
	global.requestId = UUID.newUuid().toString();
}

module.exports = {
	getCommerceAdminConfig,
	initSdk,
	initRequestId,
};
