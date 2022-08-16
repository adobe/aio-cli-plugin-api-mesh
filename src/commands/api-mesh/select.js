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

const { Command } = require('@oclif/command');
const Config = require('@adobe/aio-lib-core-config');

const logger = require('../../classes/logger');
const { initSchemaServiceClient, initRequestId, getLibConsoleCLI } = require('../../helpers');

require('dotenv').config();

class SelectCommand extends Command {
	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const schemaServiceClient = await initSchemaServiceClient();

		const org = await this.selectOrg();
		const project = await this.selectProject(org.id);
		const workspace = await this.selectWorkspace(org.id, project.id);

		try {
			const meshId = await schemaServiceClient.getMeshId(org.id, project.id, workspace.id);

			if (meshId) {
				this.log(
					`Selected MeshId: ${meshId} for org: ${org.id} project: ${project.id} workspace: ${workspace.id}`,
				);

				Config.set('console.org', org);
				Config.set('console.project', project);
				Config.set('console.workspace', workspace);
			} else {
				throw new Error('No mesh found');
			}
		} catch (err) {
			logger.error(err);

			this.error(
				`Unable to get mesh config. No mesh found for Org(${org.id}) -> Project(${project.id}) -> Workspace(${workspace.id}). Please check the details and try again.`,
			);
		}
	}

	async selectOrg() {
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
	}

	async selectProject(orgId) {
		const { consoleCLI } = await getLibConsoleCLI();
		const projects = await consoleCLI.getProjects(orgId);

		if (projects.length > 0) {
			const selectedProject = await consoleCLI.promptForSelectProject(projects);

			if (selectedProject) {
				return selectedProject;
			} else {
				throw new Error('No project selected');
			}
		} else {
			this.error('No projects found');
		}
	}

	async selectWorkspace(orgId, projectId) {
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
			this.error('No workspaces found');
		}
	}
}

SelectCommand.description = 'Select and Cache a mesh';

module.exports = SelectCommand;
