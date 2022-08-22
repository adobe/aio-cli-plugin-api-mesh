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
jest.mock('@adobe/aio-lib-env');
jest.mock('@adobe/aio-lib-ims');
jest.mock('@adobe/aio-cli-lib-console');
jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));

const mockConsoleCLIInstance = {};

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };

const selectedProject = { id: '5678', title: 'Project01' };

const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

const DeleteCommand = require('../delete');
const { initSdk, initRequestId, promptConfirm } = require('../../../helpers');

const mockDeleteMesh = jest.fn().mockResolvedValue({ status: 'success' });
const mockGetApiKeyCredential = jest
	.fn()
	.mockResolvedValue({ id_integration: 'dummy_integration_id', client_id: 'dummy_client_id' });
const mockUnsubscribeCredentialFromMeshService = jest.fn().mockResolvedValue(['dummy_service']);

const mockSchemaServiceClient = {
	deleteMesh: mockDeleteMesh,
	getApiKeyCredential: mockGetApiKeyCredential,
	unsubscribeCredentialFromMeshService: mockUnsubscribeCredentialFromMeshService,
};

let logSpy = null;
let errorLogSpy = null;

describe('delete command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			schemaServiceClient: mockSchemaServiceClient,
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(DeleteCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(DeleteCommand.prototype, 'error');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot delete command description', () => {
		expect(DeleteCommand.description).toMatchInlineSnapshot(`"Delete the config of a given mesh"`);
	});

	test('should fail if mesh id is missing', async () => {
		const runResult = DeleteCommand.run([]);

		return runResult.catch(err => {
			expect(err).toHaveProperty(
				'message',
				expect.stringMatching(/^Missing Mesh ID. Run aio api-mesh delete --help for more info/),
			);
			expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
			expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			Array [
			  Array [
			    "Missing Mesh ID. Run aio api-mesh delete --help for more info.",
			  ],
			]
		`);
		});
	});

	test('should not delete if user prompt returns false', async () => {
		promptConfirm.mockResolvedValueOnce(false);

		const meshId = 'sample_merchant';
		const runResult = await DeleteCommand.run([meshId]);

		expect(runResult).toBe('Delete cancelled');
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Delete cancelled",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should fail if mesh delete fails', async () => {
		mockDeleteMesh.mockRejectedValueOnce(new Error('mesh delete failed'));
		const meshId = 'sample_merchant';
		const runResult = DeleteCommand.run([meshId]);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "mesh delete failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should delete mesh but fail to unsubscribe if unable to get api key', async () => {
		mockGetApiKeyCredential.mockRejectedValueOnce(new Error('unable to get api key'));
		const meshId = 'sample_merchant';
		const runResult = DeleteCommand.run([meshId]);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully deleted mesh %s",
		    "sample_merchant",
		  ],
		  Array [
		    "unable to get api key",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should delete mesh but fail to unsubscribe if unsubscribe api failed', async () => {
		mockUnsubscribeCredentialFromMeshService.mockRejectedValueOnce(
			new Error('unsubscribe api failed'),
		);
		const meshId = 'sample_merchant';
		const runResult = DeleteCommand.run([meshId]);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully deleted mesh %s",
		    "sample_merchant",
		  ],
		  Array [
		    "unsubscribe api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should delete mesh and unsubscribe if correct args are provided', async () => {
		const meshId = 'sample_merchant';
		const runResult = await DeleteCommand.run([meshId]);

		expect(initRequestId).toHaveBeenCalled();
		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "status": "success",
		}
	`);
		expect(mockDeleteMesh.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "1234",
		    "5678",
		    "123456789",
		    "sample_merchant",
		  ],
		]
	`);
		expect(mockGetApiKeyCredential.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "1234",
		    "5678",
		    "123456789",
		  ],
		]
	`);
		expect(mockUnsubscribeCredentialFromMeshService.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "1234",
		    "5678",
		    "123456789",
		    "dummy_integration_id",
		  ],
		]
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully deleted mesh %s",
		    "sample_merchant",
		  ],
		  Array [
		    "Successfully unsubscribed API Key %s",
		    "dummy_client_id",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});
});
