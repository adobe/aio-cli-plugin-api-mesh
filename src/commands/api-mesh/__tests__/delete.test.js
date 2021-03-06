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

jest.mock('@adobe/aio-lib-env');
jest.mock('@adobe/aio-cli-lib-console');

const inquirer = require('inquirer');

const mockConsoleCLIInstance = {};

const orgs = [{ id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' }];
const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };

const projects = [{ id: '5678', title: 'Project01' }];
const selectedProject = { id: '5678', title: 'Project01' };

const workspaces = [{ id: '123456789', title: 'Workspace01' }];
const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

function setDefaultMockConsoleCLI() {
	mockConsoleCLIInstance.getToken = jest.fn().mockReturnValue('test_token');
	mockConsoleCLIInstance.getCliEnv = jest.fn().mockReturnValue('prod');

	mockConsoleCLIInstance.getOrganizations = jest.fn().mockResolvedValue(orgs);
	mockConsoleCLIInstance.promptForSelectOrganization = jest.fn().mockResolvedValue(selectedOrg);

	mockConsoleCLIInstance.getProjects = jest.fn().mockResolvedValue(projects);
	mockConsoleCLIInstance.promptForSelectProject = jest.fn().mockResolvedValue(selectedProject);

	mockConsoleCLIInstance.getWorkspaces = jest.fn().mockResolvedValue(workspaces);
	mockConsoleCLIInstance.promptForSelectWorkspace = jest.fn().mockResolvedValue(selectedWorkspace);
}

jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));

jest.mock('@adobe/aio-lib-ims');

jest.mock('inquirer', () => ({
	createPromptModule: jest.fn().mockReturnValue(
		jest.fn().mockResolvedValue({
			res: true,
		}),
	),
}));

const DeleteCommand = require('../delete');
const { SchemaServiceClient } = require('../../../classes/SchemaServiceClient');

describe('delete command tests', () => {
	beforeEach(() => {
		setDefaultMockConsoleCLI();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should fail if mesh id is missing', async () => {
		const runResult = DeleteCommand.run([]);

		return runResult.catch(err => {
			expect(err).toHaveProperty(
				'message',
				expect.stringMatching(/^Missing Mesh ID. Run aio api-mesh delete --help for more info/),
			);
		});
	});

	test('should delete if correct args are provided', async () => {
		jest
			.spyOn(SchemaServiceClient.prototype, 'deleteMesh')
			.mockImplementation(() => Promise.resolve({}));
		expect.assertions(1);
		const meshId = 'sample_merchant';
		const runResult = DeleteCommand.run([meshId]);

		await expect(runResult).resolves.toEqual({});
	});

	test('should not delete if user prompt returns false', async () => {
		inquirer.createPromptModule.mockReturnValue(
			jest.fn().mockResolvedValue({
				res: false,
			}),
		);

		const meshId = 'sample_merchant';
		const runResult = await DeleteCommand.run([meshId]);

		expect(runResult).toBe('Delete cancelled');
	});
});
