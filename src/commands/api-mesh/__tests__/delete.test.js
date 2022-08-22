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
jest.mock('../../../lib/devConsole');

const mockConsoleCLIInstance = {};

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };

const selectedProject = { id: '5678', title: 'Project01' };

const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

const DeleteCommand = require('../delete');
const { initSdk, initRequestId, promptConfirm } = require('../../../helpers');
const {
	getMeshId,
	deleteMesh,
	getApiKeyCredential,
	unsubscribeCredentialFromMeshService,
} = require('../../../lib/devConsole');

let logSpy = null;
let errorLogSpy = null;

let parseSpy = null;

const mockIgnoreCacheFlag = Promise.resolve(true);
const mockAutoApproveAction = Promise.resolve(false);

describe('delete command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(DeleteCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(DeleteCommand.prototype, 'error');

		getMeshId.mockResolvedValue('mesh_id');
		deleteMesh.mockResolvedValue({ status: 'success' });
		getApiKeyCredential.mockResolvedValue({
			id_integration: 'dummy_integration_id',
			client_id: 'dummy_client_id',
		});
		unsubscribeCredentialFromMeshService.mockResolvedValue(['dummy_service']);

		parseSpy = jest.spyOn(DeleteCommand.prototype, 'parse');
		parseSpy.mockResolvedValue({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
			},
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot delete command description', () => {
		expect(DeleteCommand.description).toMatchInlineSnapshot(`"Delete the config of a given mesh"`);
		expect(DeleteCommand.args).toMatchInlineSnapshot(`undefined`);
		expect(DeleteCommand.flags).toMatchInlineSnapshot(`
		Object {
		  "autoConfirmAction": Object {
		    "allowNo": false,
		    "char": "c",
		    "default": false,
		    "description": "Auto confirm action prompt. CLI will not check for user approval before executing the action.",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "ignoreCache": Object {
		    "allowNo": false,
		    "char": "i",
		    "default": false,
		    "description": "Ignore cache and force manual org -> project -> workspace selection",
		    "parse": [Function],
		    "type": "boolean",
		  },
		}
	`);
		expect(DeleteCommand.aliases).toMatchInlineSnapshot(`Array []`);
	});

	test('should fail if mesh id is missing', async () => {
		getMeshId.mockResolvedValue(null);
		const runResult = DeleteCommand.run();

		return runResult.catch(err => {
			expect(err.message).toMatchInlineSnapshot(
				`"Unable to delete. No mesh found for Org(1234) -> Project(5678) -> Workspace(123456789). Please check the details and try again."`,
			);
			expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
			expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			Array [
			  Array [
			    "Unable to delete. No mesh found for Org(1234) -> Project(5678) -> Workspace(123456789). Please check the details and try again.",
			  ],
			]
		`);
		});
	});

	test('should not delete if user prompt returns false', async () => {
		promptConfirm.mockResolvedValueOnce(false);

		const runResult = await DeleteCommand.run();

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

	test('should not ask for prompt if autoConfirmAction is set', async () => {
		parseSpy.mockResolvedValue({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: Promise.resolve(true),
			},
		});

		const runResult = await DeleteCommand.run();

		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "status": "success",
		}
	`);
		expect(promptConfirm).not.toHaveBeenCalled();
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully deleted mesh %s",
		    "mesh_id",
		  ],
		  Array [
		    "Successfully unsubscribed API Key %s",
		    "dummy_client_id",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should fail if mesh delete fails', async () => {
		deleteMesh.mockRejectedValueOnce(new Error('mesh delete failed'));

		const runResult = DeleteCommand.run();

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
		getApiKeyCredential.mockRejectedValueOnce(new Error('unable to get api key'));

		const runResult = DeleteCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully deleted mesh %s",
		    "mesh_id",
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
		unsubscribeCredentialFromMeshService.mockRejectedValueOnce(new Error('unsubscribe api failed'));

		const runResult = DeleteCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully deleted mesh %s",
		    "mesh_id",
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
		const runResult = await DeleteCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "status": "success",
		}
	`);
		expect(deleteMesh.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "1234",
		    "5678",
		    "123456789",
		    "mesh_id",
		  ],
		]
	`);
		expect(getApiKeyCredential.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "1234",
		    "5678",
		    "123456789",
		  ],
		]
	`);
		expect(unsubscribeCredentialFromMeshService.mock.calls).toMatchInlineSnapshot(`
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
		    "mesh_id",
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
