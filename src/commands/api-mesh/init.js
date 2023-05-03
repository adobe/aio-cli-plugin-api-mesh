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

const { Command, Flags } = require('@oclif/core');
const resolve = require('path').resolve;

const { promptConfirm, promptSelect, runCliCommand } = require('../../helpers');
const { getAppRootDir } = require('../../utils');

const fs = require('fs/promises');

class InitCommand extends Command {
	static summary = 'Initiate API Mesh workspace';
	static description =
		'This command will create a workspace where you can organise your API mesh configuration and other files';

	static args = [
		{
			name: 'projectName',
			required: true,
			description: 'Project name',
		},
	];

	static flags = {
		path: Flags.string({
			char: 'p',
			summary: 'workspace path',
			default: '.',
		}),
		packageManager: Flags.string({
			char: 'm',
			summary: 'select yarn or npm for package management',
			options: ['npm', 'yarn'],
		}),
		git: Flags.string({
			char: 'g',
			summary: 'Should the workspace be initiated as a git project.',
			options: ['y', 'n'],
		}),
	};

	static enableJsonFlag = true;

	static examples = [
		{
			description: 'API mesh workspace init',
			command: 'aio api-mesh init commerce-mesh',
		},
		{
			description: 'API mesh workspace init with flags',
			command:
				'aio api-mesh init commerce-mesh --path ./mesh_projects/test_mesh --git y --packageManager yarn',
		},
	];

	async createPackageJson(templatePath, filePath, projectTitle = 'api-mesh-starter') {
		const template = await fs.readFile(templatePath, 'utf8');

		const pkgJSON = { ...JSON.parse(template), name: projectTitle };

		await fs.writeFile(filePath, JSON.stringify(pkgJSON, null, 2), 'utf8', { mode: 'w' });
	}

	async run() {
		const { args, flags } = await this.parse(InitCommand);
		const gitFlagOptions = {
			y: true,
			n: false,
		};

		let absolutePath = resolve(flags.path);
		let shouldCreateGit = gitFlagOptions[flags.git];
		let packageManagerChoice = flags.packageManager;
		const packageJsonTemplate = `${getAppRootDir()}/src/templates/package.json`;
		const shouldCreateWorkspace = await promptConfirm(
			`Do you want to create the workspace in ${absolutePath}`,
		);

		if (shouldCreateWorkspace) {
			if (shouldCreateGit === undefined) {
				shouldCreateGit = await promptConfirm(`Do you want to initiate git in your workspace?`);
			}

			if (packageManagerChoice === undefined) {
				packageManagerChoice = await promptSelect(`Select a package manager`, [
					{ name: 'npm', value: 'npm' },
					{ name: 'yarn', value: 'yarn' },
				]);
			}

			try {
				await fs.access(absolutePath);
				if (
					!(await promptConfirm(
						'The directory is not empty. Do you want to create a sub directory with project name',
					))
				) {
					return;
				}
				absolutePath += '/' + args.projectName;
			} catch (err) {
				// No action needed
			}

			this.log(`Creating workspace in ${absolutePath}`);

			try {
				await fs.mkdir(absolutePath);
			} catch (error) {
				this.error(`Could not create directory ${error.message}`);
			}

			if (shouldCreateGit) {
				this.log('Initiating git in workspace');
				try {
					await runCliCommand('git init', absolutePath);

					const gitIgnoreTemplate = `${getAppRootDir()}/src/templates/gitignore`;

					await fs.writeFile(`${absolutePath}/.gitignore`, gitIgnoreTemplate, 'utf8', {
						mode: 'w',
					});
				} catch (error) {
					this.error(error);
				}
			}

			await fs.writeFile(`${absolutePath}/.env`, '', 'utf8', { mode: 'w' });

			this.log(`Installing dependencies`);

			await this.createPackageJson(
				packageJsonTemplate,
				`${absolutePath}/package.json`,
				args.projectName,
			);

			if (packageManagerChoice === 'npm') {
				try {
					await runCliCommand(`npm install`, absolutePath);
				} catch (error) {
					this.error(error);
				}
			}

			if (packageManagerChoice === 'yarn') {
				try {
					await runCliCommand(`yarn install`, absolutePath);
				} catch (error) {
					this.error(error);
				}
			}

			this.log('Local Workspace Created Successfully');
		}
	}
}

module.exports = InitCommand;
