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
const { exec } = require('child_process');
const { stdout, stderr } = require('process');

const { DEV_CONSOLE_BASE_URL, DEV_CONSOLE_API_KEY, AIO_CLI_API_KEY } = CONSTANTS;

/**
 * Returns the string representation of the object's path.
 * If the path evaluates to false, the default string is returned.
 *
 * @param {object} obj
 * @param {Array<string>} path
 * @param {string} defaultString
 * @returns {string}
 */
function objToString(obj, path = [], defaultString = '') {
	try {
		// Cache the current object
		let current = obj;

		// For each item in the path, dig into the object
		for (let i = 0; i < path.length; i++) {
			// If the item isn't found, return the default (or null)
			if (!current[path[i]]) return defaultString;

			// Otherwise, update the current  value
			current = current[path[i]];
		}

		if (typeof current === 'string') {
			return current;
		} else if (typeof current === 'object') {
			return JSON.stringify(current, null, 2);
		} else {
			return defaultString;
		}
	} catch (error) {
		return defaultString;
	}
}

/**
 * @param configFilePath
 */
async function getDevConsoleConfigFromFile(configFilePath) {
	try {
		if (!fs.existsSync(configFilePath)) {
			throw new Error(
				`Config file does not exist. Please run the command: aio config:set api-mesh.configPath <path_to_json_file> with a valid file.`,
			);
		}

		const data = JSON.parse(fs.readFileSync(configFilePath, { encoding: 'utf8', flag: 'r' }));

		if (!data.baseUrl || !data.apiKey) {
			throw new Error(
				'Invalid config file. Please validate the file contents and try again. Config file must contain baseUrl and apiKey.',
			);
		}

		const baseUrl = data.baseUrl.endsWith('/')
			? data.baseUrl.slice(0, data.baseUrl.length - 1)
			: data.baseUrl;

		const config = {
			baseUrl,
			accessToken: (await getLibConsoleCLI()).accessToken,
			apiKey: data.apiKey,
		};

		logger.debug(`Using cli config from ${configFilePath}: ${objToString(config)}`);

		return config;
	} catch (error) {
		logger.error(
			'Please run the command: aio config:set api-mesh.configPath <path_to_json_file> with a valid config file.',
		);

		throw new Error(error);
	}
}

/**
 * @param configObject
 */
async function getDevConsoleConfigFromObject(configObject) {
	const { baseUrl, apiKey } = configObject;
	const config = {
		baseUrl,
		accessToken: (await getLibConsoleCLI()).accessToken,
		apiKey,
	};

	logger.debug(`Using cli config: ${objToString(config)}`);

	return config;
}

/**
 * @returns {any} Returns a config object or null
 */
async function getDevConsoleConfig() {
	const configFileOrObject = Config.get('api-mesh.cliConfig');

	/**
	 * Old legacy option, needs to be deprecated
	 */
	const configPath = Config.get('api-mesh.configPath');
	if (configPath) {
		if (configFileOrObject) {
			throw new Error(
				'Found both cliConfig and configPath in api-mesh config. Please consider using only cliConfig.',
			);
		} else {
			console.warn(
				'Please consider using cliConfig instead of configPath on api-mesh config. configPath will be deprecated soon.',
			);
			logger.warn(
				'Please consider using cliConfig instead of configPath on api-mesh config. configPath will be deprecated soon.',
			);

			return await getDevConsoleConfigFromFile(configPath);
		}
	}

	if (!configFileOrObject) {
		const config = {
			baseUrl: DEV_CONSOLE_BASE_URL,
			accessToken: (await getLibConsoleCLI()).accessToken,
			apiKey: DEV_CONSOLE_API_KEY,
		};

		logger.debug(`No cli config found. Using defaults: ${objToString(config)}`);

		return config;
	} else {
		if (typeof configFileOrObject === 'object') {
			return getDevConsoleConfigFromObject(configFileOrObject);
		} else if (typeof configFileOrObject === 'string') {
			return await getDevConsoleConfigFromFile(configFileOrObject);
		} else {
			throw new Error(
				'Invalid config. Please validate and try again. Config should be a JSON object or a JSON file with baseUrl and apiKey.',
			);
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
		accessToken,
		apiKey: AIO_CLI_API_KEY,
		env: clientEnv,
	});

	return { consoleCLI, accessToken };
}

/**
 * @param options
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
			message,
			type: 'checkbox',
			choices,
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
			message,
			type: 'list',
			choices,
		},
	]);

	return selected.item;
}

/**
 * Function to run the CLI selectable list
 *
 * @param {string} message - prompt message
 * @param {object[]} choices - list of options
 * @returns {object[]} - selected options
 */
async function promptInput(message) {
	const selected = await inquirer.prompt([
		{
			name: 'item',
			message,
			type: 'input',
		},
	]);

	return selected.item;
}

/**
 *loads the pupa module dynamically and then interpolates the raw data from mesh file with object data
 * @param {data}
 * @param {obj}
 * @returns {object} having interpolationStatus, missingKeys and interpolatedMesh
 */

async function interpolateMesh(data, obj) {
	let missingKeys = new Set();
	let interpolatedMesh;
	let pupa;
	try {
		pupa = (await import('pupa')).default;
	} catch {
		throw new Error('Error while loading pupa module');
	}

	interpolatedMesh = pupa(data, obj, {
		ignoreMissing: true,
		transform: ({ value, key }) => {
			if (key.startsWith('env.')) {
				if (value) {
					return value;
				} else {
					// missing value, add to list
					missingKeys.add(key.split('.')[1]);
				}
			} else {
				//ignore
				return undefined;
			}
			return value;
		},
	});

	if (missingKeys.size) {
		return {
			interpolationStatus: 'failed',
			missingKeys: Array.from(missingKeys),
			interpolatedMesh: '',
		};
	}
	return {
		interpolationStatus: 'success',
		missingKeys: [],
		interpolatedMeshData: interpolatedMesh,
	};
}

/** Function to run cli command
 *
 * @param command Ocliff/Command
 * @param workingDirectory string
 *
 * @returns Promise<void>
 */
function runCliCommand(command, workingDirectory = '.') {
	return new Promise((resolve, reject) => {
		const childProcess = exec(command, { cwd: workingDirectory });
		childProcess.stdout.pipe(stdout);
		childProcess.stdin.pipe(stderr);
		childProcess.on('exit', code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${command} exection failed`));
			}
		});
	});
}

module.exports = {
	objToString,
	promptInput,
	promptConfirm,
	getLibConsoleCLI,
	getDevConsoleConfig,
	initSdk,
	initRequestId,
	promptSelect,
	promptMultiselect,
	interpolateMesh,
	runCliCommand,
};
