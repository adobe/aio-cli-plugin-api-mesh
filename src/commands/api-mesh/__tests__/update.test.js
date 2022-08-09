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

jest.mock('axios');
const inquirer = require('inquirer');

const mockConsoleCLIInstance = {};
jest.mock('@adobe/aio-lib-env');
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

jest.mock('inquirer', () => ({
	createPromptModule: jest.fn().mockReturnValue(
		jest.fn().mockResolvedValue({
			res: true,
		}),
	),
}));

jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));
jest.mock('@adobe/aio-lib-ims');

const UpdateCommand = require('../update');
const { SchemaServiceClient } = require('../../../classes/SchemaServiceClient');
const mockUpdateMesh = require('../../__fixtures__/sample_mesh.json');

let logSpy = null;
let errorLogSpy = null;

describe('update command tests', () => {
	beforeEach(() => {
		setDefaultMockConsoleCLI();
		const response = mockUpdateMesh;
		jest.spyOn(SchemaServiceClient.prototype, 'updateMesh').mockImplementation(data => response);
		logSpy = jest.spyOn(UpdateCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(UpdateCommand.prototype, 'error');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should fail if update file path is missing', async () => {
		const runResult = UpdateCommand.run(['dummy_mesh_id']);

		await expect(runResult).rejects.toEqual(
			new Error('Missing required args. Run aio api-mesh update --help for more info.'),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Missing required args. Run aio api-mesh update --help for more info.",
		  ],
		]
	`);
	});

	test('should fail if dummy file path is provided', async () => {
		const runResult = UpdateCommand.run(['dummy_mesh_id', 'dummy_file_path']);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "ENOENT: no such file or directory, open 'dummy_file_path'",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to read the mesh configuration file provided. Please check the file and try again.",
		  ],
		]
	`);
	});

	test('should pass with valid args', async () => {
		const runResult = UpdateCommand.run([
			'sample_merchant',
			'src/commands/__fixtures__/sample_mesh.json',
		]);

		await expect(runResult).resolves.toEqual(mockUpdateMesh);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully updated the mesh with the id: %s",
		    "sample_merchant",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should not update if user prompt returns false', async () => {
		inquirer.createPromptModule.mockReturnValue(
			jest.fn().mockResolvedValue({
				res: false,
			}),
		);

		const runResult = await UpdateCommand.run([
			'sample_merchant',
			'src/commands/__fixtures__/sample_mesh.json',
		]);

		expect(runResult).toBe('Update cancelled');
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Update cancelled",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});
});
