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
const path = require('path');
const fs = require('fs/promises');

const { promptConfirm, promptSelect, runCliCommand } = require('../../helpers');
const { getAppRootDir } = require('../../utils');

const { resolve } = path;

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

	async cloneFile(templatePath, filePath) {
		const templateFileContents = await fs.readFile(templatePath, 'utf8');

		const dirPath = path.dirname(filePath);

		try {
			await fs.access(dirPath);
		} catch {
			await fs.mkdir(dirPath, { recursive: true });
		}

		await fs.writeFile(filePath, templateFileContents, 'utf8', { mode: 'w' });
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
		const dotNpmrcPath = `${getAppRootDir()}/src/templates/npmrc`;
		const vsCodeLaunchJsonPath = `${getAppRootDir()}/src/templates/vscode_launch.json`;
		const devContainerJsonPath = `${getAppRootDir()}/src/templates/devcontainer.json`;
		const sampleENVPath = `${getAppRootDir()}/src/templates/sample.env`;
		const deployWorkflowPath = `${getAppRootDir()}/src/templates/deployWorkflow.yaml`;
		const loadTestWorkflowPath = `${getAppRootDir()}/src/templates/loadTestWorkflow.yaml`;
		const k6TestsPath = `${getAppRootDir()}/src/templates/k6Tests.js`;
		const convertHTMLToPDFPath = `${getAppRootDir()}/src/templates/convertHTMLToPDF.js`;
		const readmePath = `${getAppRootDir()}/src/templates/readme.md`;
		const sampleMeshConfigPath = `${getAppRootDir()}/src/templates/mesh.json`;
		const newRelicConfigPath = `${getAppRootDir()}/src/templates/newrelic.cjs`;
		const wranglerTomlTemplate = `${getAppRootDir()}/src/templates/wrangler.toml`;
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

					const gitIgnoreTemplatePath = `${getAppRootDir()}/src/templates/gitignore`;
					const gitIgnoreFilePath = `${absolutePath}/.gitignore`;

					await this.cloneFile(gitIgnoreTemplatePath, gitIgnoreFilePath);
					await this.cloneFile(deployWorkflowPath, `${absolutePath}/.github/workflows/deploy.yaml`);
					await this.cloneFile(
						loadTestWorkflowPath,
						`${absolutePath}/.github/workflows/loadTest.yaml`,
					);
					await this.cloneFile(k6TestsPath, `${absolutePath}/k6Tests.js`);
					await this.cloneFile(convertHTMLToPDFPath, `${absolutePath}/convertHTMLToPDF.js`);
				} catch (error) {
					this.error(error);
				}
			}

			await this.createPackageJson(
				packageJsonTemplate,
				`${absolutePath}/package.json`,
				args.projectName,
			);

			await this.cloneFile(dotNpmrcPath, `${absolutePath}/.npmrc`);
			await this.cloneFile(vsCodeLaunchJsonPath, `${absolutePath}/.vscode/launch.json`);
			await this.cloneFile(devContainerJsonPath, `${absolutePath}/.devcontainer/devcontainer.json`);
			await this.cloneFile(sampleENVPath, `${absolutePath}/.env`);
			await this.cloneFile(readmePath, `${absolutePath}/README.md`);
			await this.cloneFile(sampleMeshConfigPath, `${absolutePath}/mesh.json`);
			await this.cloneFile(newRelicConfigPath, `${absolutePath}/newrelic.cjs`);
			await this.cloneFile(wranglerTomlTemplate, `${absolutePath}/wrangler.toml`);

			this.log(`Installing dependencies`);

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

			this.log('Local workspace created successfully');
		}
	}
}

module.exports = InitCommand;
