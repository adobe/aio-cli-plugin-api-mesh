/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { Command, Flags } = require('@oclif/core');
const SourceRegistryStorage = require('source-registry-storage-adapter');
const { promptConfirm, promptInput, initRequestId, initSdk } = require('../../../helpers');
const { ignoreCacheFlag } = require('../../../utils');
const config = require('@adobe/aio-lib-core-config');
const logger = require('../../../classes/logger');
const { readFile } = require('fs/promises');
const chalk = require('chalk');
const { getMeshId, getMesh, updateMesh } = require('../../../lib/devConsole');
const JsonInterpolate = require('json-interpolate');

class InstallCommand extends Command {
	static args = [{ name: 'source' }];

	constructor() {
		super(...arguments);
		this.sourceRegistryStorage = new SourceRegistryStorage(
			config.get('api-mesh.sourceRegistry.path'),
		);
	}

	async run() {
		const { flags, args } = await this.parse(InstallCommand);
		await initRequestId();
		logger.info(`RequestId: ${global.requestId}`);
		const ignoreCache = await flags.ignoreCache;
		const { imsOrgId, projectId, workspaceId } = await initSdk({ ignoreCache });
		const filepath = flags['variable-file'];
		let variables = flags.variable
			? flags.variable.reduce((obj, val) => {
					const splited = val.split('=');
					obj[splited[0].trim()] = splited[1].trim();
					return obj;
			  }, {})
			: {};
		if (filepath) {
			try {
				variables = { ...variables, ...JSON.parse(await readFile(filepath, 'utf8')) };
			} catch (e) {
				this.error(`Something went wrong when reading variables file.` + `\n${e.message}`);
			}
		}

		let meshId = null;
		if (!args.source && !flags.source) {
			this.error(
				`The "aio api-mesh:source:install" command requires additional parameters` +
					`\nUse "aio api-mesh:source:install --help" to see parameters information.`,
			);
		}
		let list;
		try {
			list = await this.sourceRegistryStorage.getList();
		} catch (err) {
			this.error(`Cannot get the list of sources: ${err}`);
		}
		const sources = flags.source ? flags.source : [args.source];
		const sourceConfigs = [];
		for (const source of sources) {
			let [name, version] = source.split('@');
			const normalizedName = this.normalizeName(name);
			if (!list[normalizedName]) {
				this.error(
					chalk.red(
						`The source with the name "${name}" doesn't exist.` +
							`\nUse "aio api-mesh:source:discover" command to see avaliable sources.`,
					),
				);
			}
			version = version || list[normalizedName].latest;
			if (!list[normalizedName].versions.includes(version)) {
				this.error(
					chalk.red(
						`The version "${version}" for source name "${name}" doesn't exist.` +
							`\nUse "aio api-mesh:source:discover" command to see avaliable source versions.`,
					),
				);
			}
			const sourceConfig = await this.sourceRegistryStorage.get(name, version);
			const jsonInterpolate = new JsonInterpolate({ variablesSchema: sourceConfig.variables });
			const sourceProviderString = JSON.stringify(sourceConfig.provider);
			const sourceVariables = jsonInterpolate.getJsonVariables(sourceProviderString);
			const missedVariables = jsonInterpolate.getMissedVariables(variables, sourceVariables);
			for (const missedVariable of missedVariables) {
				variables[missedVariable.name] = await promptInput(
					`Enter the value for variable ${missedVariable.name}:`,
				);
			}

			const { error, data } = jsonInterpolate.interpolate(
				JSON.stringify(sourceConfig.provider),
				variables,
			);
			if (error) {
				this.error(chalk.red(`${error.message}\n${error.list.map(err => err.message).join('\n')}`));
			}
			sourceConfigs.push(JSON.parse(data));
		}

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		if (!meshId) {
			this.error(
				`Unable to get mesh config. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again.`,
			);
		}

		try {
			const mesh = await getMesh(imsOrgId, projectId, workspaceId, meshId);

			if (!mesh) {
				this.error(
					`Unable to get mesh with the ID ${meshId}. Please check the mesh ID and try again. RequestId: ${global.requestId}`,
					{ exit: false },
				);
			}
			const verifiedSources = this.verifySourceAlreadyExists(
				mesh.meshConfig.sources,
				sourceConfigs,
			);
			let override = false;
			if (verifiedSources.installed.length) {
				override = await promptConfirm(
					`The next sources are already installed: ${verifiedSources.installed
						.map(source => source.name)
						.join(', ')}.
                    Do you want to override?`,
				);
			}

			mesh.meshConfig.sources = override
				? [...mesh.meshConfig.sources, ...verifiedSources.installed, ...verifiedSources.unique]
				: [...mesh.meshConfig.sources, ...verifiedSources.unique];
			try {
				const response = await updateMesh(imsOrgId, projectId, workspaceId, meshId, {
					meshConfig: mesh.meshConfig,
				});

				this.log('Successfully updated the mesh with the id: %s', meshId);

				return response;
			} catch (error) {
				this.log(error.message);

				this.error(
					`Unable to update the mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}

			return mesh;
		} catch (error) {
			this.log(error.message);
			this.error(
				`Unable to get mesh. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
			);
		}
	}

	normalizeName(name) {
		return name.toLowerCase().split(' ').join('-');
	}

	verifySourceAlreadyExists(meshSources, installSources) {
		const alreadyInstalledSources = [];
		const uniqueSourcesToInstall = [];
		installSources.forEach(installSource => {
			const source = meshSources.find(meshSource => meshSource.name === installSource.name);
			if (source) {
				alreadyInstalledSources.push(source);
			} else {
				uniqueSourcesToInstall.push(installSource);
			}
		});
		return {
			installed: alreadyInstalledSources,
			unique: uniqueSourcesToInstall,
		};
	}
}

InstallCommand.flags = {
	'variable': Flags.string({
		char: 'v',
		description: 'Variables required for the source',
		multiple: true,
	}),
	'variable-file': Flags.string({
		char: 'f',
		description: 'Path to the file with variables',
	}),
	'ignoreCache': ignoreCacheFlag,
};

InstallCommand.description = 'Command install the source to your API mesh.';
InstallCommand.examples = [
	'$ aio api-mesh:source:install <version>@<source_name>',
	'$ aio api-mesh:source:install <source_name> -v <variable_name>=<variable_value>',
	'$ aio api-mesh:source:install <source_name> -f <path_to_variables_file>',
];

module.exports = InstallCommand;
