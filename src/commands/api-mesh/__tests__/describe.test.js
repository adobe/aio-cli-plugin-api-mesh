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

jest.mock('axios');
jest.mock('@adobe/aio-lib-env');
jest.mock('@adobe/aio-cli-lib-console');
jest.mock('@adobe/aio-lib-ims');
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
}));
jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));
jest.mock('../../../lib/devConsole');

const DescribeCommand = require('../describe');
const { initSdk, initRequestId } = require('../../../helpers');
const { describeMesh, getMesh } = require('../../../lib/devConsole');
const sampleCreateMeshConfig = require('../../__fixtures__/sample_mesh.json');

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };
const selectedProject = { id: '5678', title: 'Project01' };
const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

let logSpy = null;
let errorLogSpy = null;
let parseSpy = null;

const mockIgnoreCacheFlag = jest.fn().mockResolvedValue(true);

describe('describe command tests', () => {
	beforeEach(() => {
		describeMesh.mockResolvedValue({
			meshId: 'dummy_meshId',
			apiKey: 'dummy_apiKey',
		});

		initSdk.mockResolvedValue({
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(DescribeCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(DescribeCommand.prototype, 'error');

		parseSpy = jest.spyOn(DescribeCommand.prototype, 'parse');
		parseSpy.mockResolvedValue({
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
			},
		});

		let fetchedMeshConfig = sampleCreateMeshConfig;
		fetchedMeshConfig.meshConfig.meshId = 'dummy_id';
		fetchedMeshConfig.meshConfig.meshURL = '';

		getMesh.mockResolvedValue(fetchedMeshConfig);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot describe command description', () => {
		expect(DescribeCommand.description).toMatchInlineSnapshot(`"Get details of a mesh"`);
		expect(DescribeCommand.args).toMatchInlineSnapshot(`undefined`);
		expect(DescribeCommand.flags).toMatchInlineSnapshot(`
		{
		  "ignoreCache": {
		    "allowNo": false,
		    "char": "i",
		    "default": false,
		    "description": "Ignore cache and force manual org -> project -> workspace selection",
		    "parse": [Function],
		    "type": "boolean",
		  },
		}
	`);
		expect(DescribeCommand.aliases).toMatchInlineSnapshot(`[]`);
	});

	test('should error if describe api has failed', async () => {
		describeMesh.mockRejectedValueOnce(new Error('Describe api failed'));

		const runResult = DescribeCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Describe api failed Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Describe api failed Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should error if mesh details is missing from describe api response', async () => {
		describeMesh.mockResolvedValueOnce(null);

		const runResult = DescribeCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should error if mesh id is missing from describe api response', async () => {
		describeMesh.mockResolvedValueOnce({});
		await DescribeCommand.run().catch(err => {
			expect(err.message).toContain(
				'Unable to get mesh details. Please check the details and try again.',
			);
		});
	});

	test('should not fail if api key is missing from mesh details', async () => {
		describeMesh.mockResolvedValueOnce({ meshId: 'dummy_meshId' });

		const runResult = await DescribeCommand.run();

		expect(runResult).toMatchInlineSnapshot(`
		{
		  "meshId": "dummy_meshId",
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Successfully retrieved mesh details 
		",
		  ],
		  [
		    "Org ID: %s",
		    "1234",
		  ],
		  [
		    "Project ID: %s",
		    "5678",
		  ],
		  [
		    "Workspace ID: %s",
		    "123456789",
		  ],
		  [
		    "Mesh ID: %s",
		    "dummy_meshId",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
	});

	test('should succeed if valid details are provided', async () => {
		let fetchedMeshConfig = sampleCreateMeshConfig;
		fetchedMeshConfig.meshConfig.meshId = 'dummy_id';
		fetchedMeshConfig.meshConfig.meshURL = 'https://tigraph.adobe.io';

		getMesh.mockResolvedValue(fetchedMeshConfig);
		const runResult = await DescribeCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(describeMesh).toHaveBeenCalledWith(
			selectedOrg.id,
			selectedProject.id,
			selectedWorkspace.id,
		);
		expect(runResult).toMatchInlineSnapshot(`
		{
		  "apiKey": "dummy_apiKey",
		  "meshId": "dummy_meshId",
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Successfully retrieved mesh details 
		",
		  ],
		  [
		    "Org ID: %s",
		    "1234",
		  ],
		  [
		    "Project ID: %s",
		    "5678",
		  ],
		  [
		    "Workspace ID: %s",
		    "123456789",
		  ],
		  [
		    "Mesh ID: %s",
		    "dummy_meshId",
		  ],
		  [
		    "API Key: %s",
		    "dummy_apiKey",
		  ],
		  [
		    "Mesh Endpoint: %s
		",
		    "https://tigraph.adobe.io/dummy_meshId/graphql?api_key=dummy_apiKey",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
	});

	test('should return TI url if request is Ti', async () => {
		const runResult = await DescribeCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(describeMesh).toHaveBeenCalledWith(
			selectedOrg.id,
			selectedProject.id,
			selectedWorkspace.id,
		);
		expect(runResult).toMatchInlineSnapshot(`
		{
		  "apiKey": "dummy_apiKey",
		  "meshId": "dummy_meshId",
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Successfully retrieved mesh details 
		",
		  ],
		  [
		    "Org ID: %s",
		    "1234",
		  ],
		  [
		    "Project ID: %s",
		    "5678",
		  ],
		  [
		    "Workspace ID: %s",
		    "123456789",
		  ],
		  [
		    "Mesh ID: %s",
		    "dummy_meshId",
		  ],
		  [
		    "API Key: %s",
		    "dummy_apiKey",
		  ],
		  [
		    "Mesh Endpoint: %s
		",
		    "https://graph.adobe.io/api/dummy_meshId/graphql?api_key=dummy_apiKey",
		  ],
		]
	`);
	});
});
