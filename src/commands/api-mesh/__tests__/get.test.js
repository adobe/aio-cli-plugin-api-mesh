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

const mockConsoleCLIInstance = {};
jest.mock('@adobe/aio-lib-env');
jest.mock('@adobe/aio-cli-lib-console');
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
const GetCommand = require('../get');
const { SchemaServiceClient } = require('../../../classes/SchemaServiceClient');
const mockGetMesh = require('../../__fixtures__/sample_mesh.json');

describe('get command tests', () => {
	beforeEach(() => {
		setDefaultMockConsoleCLI();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should fail if mesh id is missing', async () => {
		const runResult = GetCommand.run([]);

		return runResult.catch(err => {
			expect(err).toHaveProperty(
				'message',
				expect.stringMatching(/^Missing Mesh ID. Run aio api-mesh get --help for more info./),
			);
		});
	});

	test('should pass if mesh id is provided', async () => {
		jest.spyOn(SchemaServiceClient.prototype, 'getMesh').mockImplementation(meshId => mockGetMesh);
		expect.assertions(1);
		const meshId = 'sample_merchant';
		const runResult = GetCommand.run([meshId]);
		await expect(runResult).resolves.toEqual(mockGetMesh);
	});
});
