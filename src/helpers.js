/* eslint-disable no-console */
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

const fs = require('fs');
const inquirer = require('inquirer');

const Config = require('@adobe/aio-lib-core-config');
const { getToken, context } = require('@adobe/aio-lib-ims');
const { CLI } = require('@adobe/aio-lib-ims/src/context');
const libConsoleCLI = require('@adobe/aio-cli-lib-console');
const { getCliEnv } = require('@adobe/aio-lib-env');

const logger = require('../src/classes/logger');
const { UUID } = require('./classes/UUID');
const CONSTANTS = require('./constants');
const { objToString } = require('./utils');

const { DEV_CONSOLE_BASE_URL, DEV_CONSOLE_API_KEY, AIO_CLI_API_KEY } = CONSTANTS;

/**
 * @returns {any} Returns a config object or null
 */
async function getDevConsoleConfig() {
	const configFile = Config.get('api-mesh.configPath');

	if (!configFile) {
		return {
			baseUrl: DEV_CONSOLE_BASE_URL,
			accessToken: (await getLibConsoleCLI()).accessToken,
			apiKey: DEV_CONSOLE_API_KEY,
		};
	} else {
		try {
			if (!fs.existsSync(configFile)) {
				throw new Error(
					`Config file does not exist. Please run the command: aio config:set api-mesh.configPath <path_to_json_file> with a valid file.`,
				);
			}

			const data = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8', flag: 'r' }));

			if (!data.baseUrl || !data.apiKey) {
				throw new Error(
					'Invalid config file. Please validate the file contents and try again. Config file must contain baseUrl and apiKey.',
				);
			}

			const baseUrl = data.baseUrl.endsWith('/')
				? data.baseUrl.slice(0, data.baseUrl.length - 1)
				: data.baseUrl;

			return {
				baseUrl: baseUrl,
				accessToken: (await getLibConsoleCLI()).accessToken,
				apiKey: data.apiKey,
			};
		} catch (error) {
			logger.error(
				'Please run the command: aio config:set api-mesh.configPath <path_to_json_file> with a valid config file.',
			);

			throw new Error(error);
		}
	}
}

/**
 * @returns {string} Returns organizations the user belongs to
 */
async function getAuthorizedOrganization() {
	logger.info(`Initializing organization selection for`);

	const { consoleCLI } = await getLibConsoleCLI();

	logger.debug('Get the selected organization');

	const consoleConfigOrg = Config.get('console.org');

	if (!consoleConfigOrg) {
		const organizations = await consoleCLI.getOrganizations();

		logger.info(`Retrieved organizations : ${objToString(organizations)}`);

		if (organizations.length !== 0) {
			const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations);

			logger.debug('Set the console org config');

			Config.set('console.org', selectedOrg);

			// remove selected project and workspace from config and let the user select a new one
			Config.delete('console.project');
			Config.delete('console.workspace');

			return Object.assign({}, selectedOrg);
		} else {
			logger.error(`No organizations found`);
		}
	} else {
		logger.debug(`Selected organization config ${objToString(consoleConfigOrg)}`);
		console.log(`Selected organization: ${consoleConfigOrg.name}`);

		return Object.assign({}, consoleConfigOrg);
	}
}

/**
 * @param imsOrgId
 * @param imsOrgTitle
 */
async function getProject(imsOrgId, imsOrgTitle) {
	logger.info(`Initializing project selection for ${imsOrgId}`);

	const { consoleCLI } = await getLibConsoleCLI();

	logger.debug('Get the selected project');

	const consoleConfigProject = Config.get('console.project');

	if (!consoleConfigProject) {
		const projects = await consoleCLI.getProjects(imsOrgId);

		logger.debug(`Retrieved projects for ${imsOrgId} : ${objToString(projects)}`);

		if (projects.length !== 0) {
			const selectedProject = await consoleCLI.promptForSelectProject(projects);

			const shouldCacheProject = await promptConfirm(
				`Do you want to use ${selectedProject.title} as selected project for future operations?`,
			);

			if (shouldCacheProject) {
				Config.set('console.project', selectedProject);
			}

			// remove selected workspace from config and let the user select a new one
			Config.delete('console.workspace');

			return Object.assign({}, selectedProject);
		} else {
			logger.error(`No projects found for the selected organization: ${imsOrgTitle}`);
		}
	} else {
		logger.debug(`Selected project config ${objToString(consoleConfigProject)}`);
		console.log(`Selected project: ${consoleConfigProject.title}`);

		return consoleConfigProject;
	}
}

/**
 * @param orgId
 * @param projectId
 * @param imsOrgTitle
 * @param projectTitle
 */
async function getWorkspace(orgId, projectId, imsOrgTitle, projectTitle) {
	logger.info(`Initializing workspace selection for ${orgId} -> ${projectId}`);

	const { consoleCLI } = await getLibConsoleCLI();

	logger.debug('Get the selected workspace');

	const consoleConfigWorkspace = Config.get('console.workspace');

	if (!consoleConfigWorkspace) {
		const workspaces = await consoleCLI.getWorkspaces(orgId, projectId);

		logger.debug(`Retrieved workspaces for ${orgId} -> ${projectId} : ${objToString(workspaces)}`);

		if (workspaces.length !== 0) {
			const selectedWorkspace = await consoleCLI.promptForSelectWorkspace(workspaces);

			const shouldCacheWorkspace = await promptConfirm(
				`Do you want to use ${selectedWorkspace.name} as selected workspace for future operations?`,
			);

			if (shouldCacheWorkspace) {
				Config.set('console.workspace', selectedWorkspace);
			}

			return Object.assign({}, selectedWorkspace);
		} else {
			logger.error(
				`No workspaces found for the selected organization: ${imsOrgTitle} and project: ${projectTitle}`,
			);
		}
	} else {
		logger.debug(`Selected workspace config ${objToString(consoleConfigWorkspace)}`);
		console.log(`Select workspace: ${consoleConfigWorkspace.name}`);

		return {
			id: consoleConfigWorkspace.id,
			title: consoleConfigWorkspace.name,
		};
	}
}

const selectAuthorizedOrganization = async () => {
	const { consoleCLI } = await getLibConsoleCLI();
	const organizations = await consoleCLI.getOrganizations();

	if (organizations.length > 0) {
		const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations);

		if (selectedOrg) {
			return selectedOrg;
		} else {
			throw new Error('No org selected');
		}
	} else {
		this.error('No organizations found');
	}
};

const selectProject = async (imsOrgId, imsOrgTitle) => {
	const { consoleCLI } = await getLibConsoleCLI();
	const projects = await consoleCLI.getProjects(imsOrgId);

	if (projects.length > 0) {
		const selectedProject = await consoleCLI.promptForSelectProject(projects);

		if (selectedProject) {
			return selectedProject;
		} else {
			throw new Error('No project selected');
		}
	} else {
		this.error('No projects found for the selected organization: ' + imsOrgTitle);
	}
};

const selectWorkspace = async (orgId, projectId, imsOrgTitle, projectTitle) => {
	const { consoleCLI } = await getLibConsoleCLI();
	const workspaces = await consoleCLI.getWorkspaces(orgId, projectId);

	if (workspaces.length > 0) {
		const selectedWorkspace = await consoleCLI.promptForSelectWorkspace(workspaces);

		if (selectedWorkspace) {
			return selectedWorkspace;
		} else {
			throw new Error('No workspace selected');
		}
	} else {
		this.error(
			'No workspaces found for the selected organization: ' +
				imsOrgTitle +
				' and project: ' +
				projectTitle,
		);
	}
};

/**
 * @returns {consoleCLI, accessToken}
 */
async function getLibConsoleCLI() {
	await context.setCli({ 'cli.bare-output': true }, false);

	const clientEnv = getCliEnv();

	const accessToken = await getToken(CLI);

	const consoleCLI = await libConsoleCLI.init({
		accessToken: accessToken,
		apiKey: AIO_CLI_API_KEY,
		env: clientEnv,
	});

	return { consoleCLI: consoleCLI, accessToken: accessToken };
}

/**
 * @returns {any} Returns an object with properties ready for consumption
 */
async function initSdk(options) {
	const { ignoreCache = false } = options;

	let org;
	let project;
	let workspace;

	if (!ignoreCache) {
		org = await getAuthorizedOrganization();
		project = await getProject(org.id, org.name);
		workspace = await getWorkspace(org.id, project.id, org.name, project.title);
	} else {
		org = await selectAuthorizedOrganization();
		project = await selectProject(org.id, org.name);
		workspace = await selectWorkspace(org.id, project.id, org.name, project.title);
	}

	logger.info(
		`Initializing SDK for org: ${org.name}, project: ${project.title} and workspace: ${workspace.title}`,
	);

	logger.info('Initialized user login and the selected organization');

	return {
		imsOrgId: org.id,
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

/**
 * Function to run the CLI Y/N prompt to confirm the user's action
 *
 * @param {string} message
 *
 * @returns boolean
 */
async function promptConfirm(message) {
	const prompt = inquirer.createPromptModule({ output: process.stderr });

	const confirm = await prompt([
		{
			type: 'confirm',
			name: 'res',
			message,
		},
	]);

	return confirm.res;
}

/**
 * Function to run the CLI selectable list
 *
 * @param {string} message - prompt message
 * @param {object[]} choices - list of options
 * @returns {object[]} - selected options
 */
async function promptMultiselect(message, choices) {
	const selected = await inquirer.prompt([
		{
			name: 'items',
			message: message,
			type: 'checkbox',
			choices: choices,
		},
	]);

	return selected.items;
}

/**
 * Function to run the CLI selectable list
 *
 * @param {string} message - prompt message
 * @param {object[]} choices - list of options
 * @returns {object[]} - selected options
 */
async function promptSelect(message, choices) {
	const selected = await inquirer.prompt([
		{
			name: 'item',
			message: message,
			type: 'list',
			choices: choices,
		},
	]);

	return selected.item;
}

module.exports = {
	promptConfirm,
	getLibConsoleCLI,
	getDevConsoleConfig,
	initSdk,
	initRequestId,
	promptSelect,
	promptMultiselect,
};
