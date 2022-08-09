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

const DescribeCommand = require('../describe');
const { initSdk, initRequestId } = require('../../../helpers');

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };

const selectedProject = { id: '5678', title: 'Project01' };

const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

const mockDescribeMesh = jest.fn().mockResolvedValue({
	meshId: 'dummy_meshId',
	apiKey: 'dummy_apiKey',
});

const mockSchemaServiceClient = {
	describeMesh: mockDescribeMesh,
};

let logSpy = null;
let errorLogSpy = null;

describe('describe command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			schemaServiceClient: mockSchemaServiceClient,
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(DescribeCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(DescribeCommand.prototype, 'error');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot describe command description', () => {
		expect(DescribeCommand.description).toMatchInlineSnapshot(`"Get details of a mesh"`);
	});

	test('should error if describe api has failed', async () => {
		mockDescribeMesh.mockRejectedValueOnce(new Error('describe api failed'));

		const runResult = DescribeCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "describe api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should error if mesh details is missing from describe api response', async () => {
		mockDescribeMesh.mockResolvedValueOnce(null);

		const runResult = DescribeCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to get mesh details",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to get mesh details. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should error if mesh id is missing from describe api response', async () => {
		mockDescribeMesh.mockResolvedValueOnce({});

		const runResult = await DescribeCommand.run();

		expect(runResult).toBe(undefined);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to get mesh details. Please check the details and try again. RequestId: dummy_request_id",
		    Object {
		      "exit": false,
		    },
		  ],
		]
	`);
	});

	test('should not fail if api key is missing from mesh details', async () => {
		mockDescribeMesh.mockResolvedValueOnce({ meshId: 'dummy_meshId' });

		const runResult = await DescribeCommand.run();

		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "meshId": "dummy_meshId",
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully retrieved mesh details 
		",
		  ],
		  Array [
		    "Org ID: %s",
		    "1234",
		  ],
		  Array [
		    "Project ID: %s",
		    "5678",
		  ],
		  Array [
		    "Workspace ID: %s",
		    "123456789",
		  ],
		  Array [
		    "Mesh ID: %s",
		    "dummy_meshId",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should succeed if valid details are provided', async () => {
		const runResult = await DescribeCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(mockDescribeMesh).toHaveBeenCalledWith(
			selectedOrg.id,
			selectedProject.id,
			selectedWorkspace.id,
		);
		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "apiKey": "dummy_apiKey",
		  "meshId": "dummy_meshId",
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully retrieved mesh details 
		",
		  ],
		  Array [
		    "Org ID: %s",
		    "1234",
		  ],
		  Array [
		    "Project ID: %s",
		    "5678",
		  ],
		  Array [
		    "Workspace ID: %s",
		    "123456789",
		  ],
		  Array [
		    "Mesh ID: %s",
		    "dummy_meshId",
		  ],
		  Array [
		    "API Key: %s",
		    "dummy_apiKey",
		  ],
		  Array [
		    "Mesh Endpoint: %s
		",
		    "https://graph.adobe.io/api/dummy_meshId/graphql?api_key=dummy_apiKey",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});
});
