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

const mockMetadataFixture = require('../__fixtures__/connectors-metadata.json');
const mockSourceTest03v1Fixture = require('../__fixtures__/0.0.1-test-03.json');
const mockAdapter = require('source-registry-storage-adapter');
const chalk = require('chalk');
const path = require('path');
const { initSdk, initRequestId, promptInput } = require('../../../../helpers');
const mockSources = { '0.0.1-test-03': mockSourceTest03v1Fixture };
jest.mock('source-registry-storage-adapter');
jest.mock('../../../../helpers');
const InstallCommand = require('../install');
const { getMeshId, getMesh, updateMesh } = require('../../../../lib/smsClient');
const mockGetMeshConfig = require('../../../__fixtures__/sample_mesh.json');
const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };
const selectedProject = { id: '5678', title: 'Project01' };
const selectedWorkspace = { id: '123456789', title: 'Workspace01' };
global.requestId = 'dummy_request_id';
jest.mock('../../../../lib/smsClient');
mockAdapter.mockImplementation(() => ({
	get: jest.fn().mockResolvedValue(mockSources[`0.0.1-test-03`]),
	getList: jest.fn().mockImplementation(() => mockMetadataFixture),
}));
getMeshId.mockResolvedValue('dummy_meshId');
getMesh.mockResolvedValue(mockGetMeshConfig);
updateMesh.mockResolvedValue({ status: 'success' });

initSdk.mockResolvedValue({
	imsOrgId: selectedOrg.id,
	projectId: selectedProject.id,
	workspaceId: selectedWorkspace.id,
	workspaceName: selectedWorkspace.title,
	organizationName: selectedOrg.name,
	projectName: selectedProject.title,
});
initRequestId.mockResolvedValue({});
promptInput.mockResolvedValueOnce('test-03');

describe('source:install command tests', () => {
	test('Snapshot install command description', () => {
		expect(InstallCommand.description).toMatchInlineSnapshot(
			`"Command to install the source to your API mesh."`,
		);
		expect(InstallCommand.flags).toMatchInlineSnapshot(`
		{
		  "confirm": {
		    "allowNo": false,
		    "char": "c",
		    "default": false,
		    "description": "Auto confirm override action prompt. CLI will not check ask user to override source.",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "ignoreCache": {
		    "allowNo": false,
		    "char": "i",
		    "default": false,
		    "description": "Ignore cache and force manual org -> project -> workspace selection",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "source": {
		    "char": "s",
		    "description": "Source name",
		    "input": [],
		    "multiple": true,
		    "parse": [Function],
		    "type": "option",
		  },
		  "variable": {
		    "char": "v",
		    "description": "Variables required for the source",
		    "input": [],
		    "multiple": true,
		    "parse": [Function],
		    "type": "option",
		  },
		  "variable-file": {
		    "char": "f",
		    "description": "Variables file path",
		    "input": [],
		    "multiple": false,
		    "parse": [Function],
		    "type": "option",
		  },
		}
	`);
		expect(InstallCommand.aliases).toMatchInlineSnapshot(`[]`);
	});
	test('Check executing without parameters', async () => {
		await InstallCommand.run([]).catch(err => {
			expect(err.message).toEqual(
				`The "aio api-mesh:source:install" command requires additional parameters` +
					`\nUse "aio api-mesh:source:install --help" to see parameters details.`,
			);
		});
	});
	test('Check executing with invalid file parameter', async () => {
		await InstallCommand.run(['test-03', '-f=notexist.json']).catch(err => {
			expect(err.message).toContain(
				`Something went wrong trying to read the variables file.` +
					`\nENOENT: no such file or directory`,
			);
		});
	});
	test('Check executing with invalid variable type', async () => {
		const newPath = path.join(__dirname, '/../__fixtures__/variables-file-invalid.json');
		const runPath = `-f=${newPath}`;
		await InstallCommand.run(['test-03', runPath]).catch(err => {
			expect(err.message).toEqual(
				chalk.red(
					`The next variables has invalid type.\nVariable: ENDPOINT_URL\nRequested type: string`,
				),
			);
		});
	});
	test('Check executing without passing variables', async () => {
		await InstallCommand.run(['test-03']);
		expect(promptInput).toHaveBeenCalledTimes(1);
	});
	test('Check executing without passing variables and input data', async () => {
		await InstallCommand.run(['test-03']).catch(err => {
			expect(err.message).toEqual(
				chalk.red(
					`The next variables has invalid type.\nVariable: ENDPOINT_URL\nRequested type: string`,
				),
			);
		});
		expect(promptInput).toHaveBeenCalledTimes(1);
	});
	test('Check executing with passing variables in CLI', async () => {
		const parsed =
			'{"name":"Test 03","version":"0.0.1","description":"Mock for variable injection","author":"VladimirZaets","variables":{"ENDPOINT_URL":{"name":"Test API","description":"This URL will be used to query the third-party API","type":"string"}},"provider":{"name":"Commerce","handler":{"graphql":{"endpoint":"https:www.myendpoint.com/api"}},"transforms":[{"rename":{"mode":"bare | wrap","renames":[{"from":{"type":"Query","field":"compareList"},"to":{"type":"Query","field":"productCompareList"}}]}}]}}';
		const res = { ...mockGetMeshConfig };
		res.meshConfig.sources.push(JSON.parse(parsed));
		await InstallCommand.run(['test-03', '-v ENDPOINT_URL=https:www.myendpoint.com/api']);
		expect(promptInput).toHaveBeenCalledTimes(0);
		expect(updateMesh).toHaveBeenCalledWith(
			selectedOrg.id,
			selectedProject.id,
			selectedWorkspace.id,
			selectedWorkspace.title,
			selectedOrg.name,
			selectedProject.title,
			'dummy_meshId',
			res,
		);
	});
});
