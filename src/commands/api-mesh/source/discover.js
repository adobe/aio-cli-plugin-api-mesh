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

const { Command, CliUx, Flags } = require('@oclif/core');
const { promptConfirm, promptMultiselect, promptSelect } = require('../../../helpers');
const SourceRegistryStorage = require('source-registry-storage-adapter');
const config = require('@adobe/aio-lib-core-config');
const logger = require('../../../classes/logger');
const InstallCommand = require('./install');

class DiscoverCommand extends Command {
	async run() {
		try {
			logger.info(`RequestId: ${global.requestId}`);
			const { flags } = await this.parse(DiscoverCommand);
			const srs = new SourceRegistryStorage(config.get('api-mesh.sourceRegistry.path'));
			let list;
			try {
				list = await srs.getList();
			} catch (error) {
				logger.error(error);
				this.error(`Cannot get the list of sources: ${error}`);
			}

			this.generateSourcesTable(list);
			let needInstall = false;

			if (flags.confirm) {
				needInstall = true;
			} else {
				needInstall = await promptConfirm(`Do you want to install sources?`);
			}

			if (needInstall) {
				const toInstall = await this.handleMultiple(list);
				const params = [];
				toInstall.forEach(source => {
					params.push('-s');
					params.push(source);
				});
				InstallCommand.run(params);
			}
		} catch (error) {
			logger.error(error);
			this.error(`
				Something went wrong with "discover" command. Please try again later.
				${error}
			`);
		}
	}

	async handleMultiple(data) {
		const result = [];
		let selectedList =
			(await promptMultiselect(
				'Select sources to install',
				Object.values(data).map(elem => ({ name: elem.name, value: elem })),
			)) || [];

		if (!selectedList.length) {
			while (!selectedList.length) {
				selectedList =
					(await promptMultiselect(
						'Please choose at least one source',
						Object.values(data).map(elem => ({ name: elem.name, value: elem })),
					)) || [];
			}
		}

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

	async generateSourcesTable(data) {
		const columns = {
			name: {
				get: row => `${row.name}`,
			},
			current: {
				get: row => `${row.latest}`,
			},
			description: {
				get: row => `${row.description}`,
			},
			versions: {
				get: row => row.versions.reduce((prev, next) => `${prev}, ${next}`),
			},
		};
		CliUx.Table.table(Object.values(data), columns);
	}
}

DiscoverCommand.flags = {
	confirm: Flags.boolean({
		char: 'c',
		description:
			'Auto confirm install action prompt. CLI will not check ask user to install source.',
		default: false,
	}),
};

DiscoverCommand.description = 'Return the list of avaliable sources';

module.exports = DiscoverCommand;
