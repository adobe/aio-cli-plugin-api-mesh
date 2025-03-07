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
const CachePurgeCommand = require('../cache/purge');
const { initSdk, initRequestId, promptConfirm } = require('../../../helpers');
const {
	getMeshId,
	deleteMesh,
	getApiKeyCredential,
	unsubscribeCredentialFromMeshService,
	cachePurge,
} = require('../../../lib/devConsole');
let logSpy = null;
let errorLogSpy = null;
let parseSpy = null;
const mockIgnoreCacheFlag = Promise.resolve(true);
const mockAutoApproveAction = Promise.resolve(false);

describe('cache purge command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			imsOrgCode: selectedOrg.code,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});
		global.requestId = 'dummy_request_id';
		logSpy = jest.spyOn(CachePurgeCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(CachePurgeCommand.prototype, 'error');

		getMeshId.mockResolvedValue('mesh_id');
		deleteMesh.mockResolvedValue({ status: 'success' });
		getApiKeyCredential.mockResolvedValue({
			id_integration: 'dummy_integration_id',
			client_id: 'dummy_client_id',
		});
		unsubscribeCredentialFromMeshService.mockResolvedValue(['dummy_service']);

		parseSpy = jest.spyOn(CachePurgeCommand.prototype, 'parse');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should fail if all flag is missing', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
				all: Promise.resolve(false),
			},
		});

		const runResult = CachePurgeCommand.run();

		return runResult.catch(err => {
			expect(err.message).toMatchInlineSnapshot(
				`"Unable to purge cache. If the error persists please contact support. RequestId: dummy_request_id"`,
			);
			expect(logSpy.mock.calls).toMatchInlineSnapshot(`
			[
			  [
			    "Unable to purge cache. If the error persists please contact support. RequestId: dummy_request_id",
			  ],
			]
		`);
			expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			[
			  [
			    "Unable to purge cache. If the error persists please contact support. RequestId: dummy_request_id",
			  ],
			]
		`);
		});
	});

	test('should fail if unable to get mesh ID', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
				all: Promise.resolve(true),
			},
		});
		getMeshId.mockResolvedValueOnce(null);

		const runResult = CachePurgeCommand.run();

		return runResult.catch(err => {
			expect(err.message).toMatchInlineSnapshot(
				`"Unable to purge cache. No mesh found for Org(CODE1234@AdobeOrg) -> Project(5678) -> Workspace(123456789). Check the details and try again."`,
			);
			expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
			expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			                [
			                  [
			                    "Unable to purge cache. No mesh found for Org(CODE1234@AdobeOrg) -> Project(5678) -> Workspace(123456789). Check the details and try again.",
			                  ],
			                ]
		            `);
		});
	});

	test('should not purge cache if user prompt returns false', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
				all: Promise.resolve(true),
			},
		});
		promptConfirm.mockResolvedValueOnce(false);

		const runResult = await CachePurgeCommand.run();

		expect(runResult).toBe('Cache purge cancelled');
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Cache purge cancelled",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
	});

	test('should not ask for prompt if autoConfirmAction is set', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: Promise.resolve(true),
				all: Promise.resolve(true),
			},
		});
		cachePurge.mockResolvedValueOnce({ success: true });
		const runResult = await CachePurgeCommand.run();

		expect(runResult).toMatchInlineSnapshot(`
		            {
		              "success": true,
		            }
	        `);
		expect(promptConfirm).not.toHaveBeenCalled();
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		            [
		              [
		                "Successfully purged cache for mesh %s",
		                "mesh_id",
		              ],
		            ]
	        `);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
	});

	test('should fail if cache purge fails', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: Promise.resolve(false),
				all: Promise.resolve(true),
			},
		});
		cachePurge.mockRejectedValueOnce(new Error('cache purge failed'));

		const runResult = CachePurgeCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to purge cache. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "cache purge failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to purge cache. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should purge cache if correct args are provided', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: Promise.resolve(true),
				all: Promise.resolve(true),
			},
		});
		cachePurge.mockResolvedValueOnce({ success: true });
		const runResult = await CachePurgeCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(runResult).toMatchInlineSnapshot(`
		{
		  "success": true,
		}
	`);
		expect(cachePurge.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "CODE1234@AdobeOrg",
		    "5678",
		    "123456789",
		    "mesh_id",
		  ],
		]
	`);

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Successfully purged cache for mesh %s",
		    "mesh_id",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
	});
});
