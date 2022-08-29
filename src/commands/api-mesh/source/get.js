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
const { promptMultiselect, promptSelect, promptConfirm } = require('../../../helpers');
const ncp = require('copy-paste');
const chalk = require('chalk');
const config = require('@adobe/aio-lib-core-config');

class GetCommand extends Command {
	constructor() {
		super(...arguments);
		this.sourceRegistryStorage = new SourceRegistryStorage(
			config.get('api-mesh.source-registry.path'),
		);
	}

	async run() {
		const list = await this.sourceRegistryStorage.getList();
		const { flags } = await this.parse(GetCommand);
		if (!flags.source && !flags.multiple) {
			this.error(
				`The "aio api-mesh:source:get" command requires additional parameters` +
				`\nUse "aio api-mesh:source:get --help" to see parameters information.`,
			);
		}
		const sources = flags.multiple ? await this.handleMultiple(list) : flags.source;
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
			sourceConfigs.push(sourceConfig.provider);
		}
		const sourceConfigsString = JSON.stringify(sourceConfigs, null, 4);
		await ncp.copy(sourceConfigsString);
		this.log(
			chalk.green.bold.underline(
				'The sources are copied to the clipboard, please paste them to your API Mesh configuration',
			),
		);
		const print = await promptConfirm(`Do you want to print Source configurations in console?`);
		if (print) {
			this.log(sourceConfigsString);
		}
	}

	async handleMultiple(data) {
		const result = [];
		const selectedList = await promptMultiselect(
			'Select sources to install',
			Object.values(data).map(elem => ({ name: elem.name, value: elem })),
		);
		for (const selected of selectedList) {
			if (selected.versions.length > 1) {
				const version = await promptSelect(
					`Please choose the version of "${selected.name}" source`,
					selected.versions.map(v => ({ name: `v${v}`, value: `${selected.name}@${v}` })),
				);
				result.push(version);
			} else {
				result.push(`${selected.name}@${selected.latest}`);
			}
		}
		return result;
	}

	normalizeName(name) {
		return name.toLowerCase().split(' ').join('-');
	}
}

GetCommand.flags = {
	source: Flags.string({
		char: 's',
		description: 'Source name',
		multiple: true,
	}),
	multiple: Flags.boolean({
		char: 'm',
		description: 'Select multiple sources',
		exclusive: ['name'],
	}),
};

GetCommand.description = 'Command returns the content of a specific connector';
GetCommand.examples = [
	'$ aio connector:get <version>@<source_name>',
	'$ aio connector:get <source_name>',
	'$ aio connector:get -m',
];

module.exports = GetCommand;
