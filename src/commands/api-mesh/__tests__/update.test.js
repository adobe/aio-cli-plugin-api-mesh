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
jest.mock('fs/promises');
jest.mock('@adobe/aio-lib-env');
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));
jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));
jest.mock('@adobe/aio-lib-ims');

const mockConsoleCLIInstance = {};

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };
const selectedProject = { id: '5678', title: 'Project01' };
const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

const { readFile } = require('fs/promises');

const UpdateCommand = require('../update');
const { initSdk, initRequestId, promptConfirm } = require('../../../helpers');

const mockUpdateMesh = jest.fn().mockResolvedValue({ status: 'success' });

const mockSchemaServiceClient = {
	updateMesh: mockUpdateMesh,
};

let logSpy = null;
let errorLogSpy = null;

describe('update command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			schemaServiceClient: mockSchemaServiceClient,
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(UpdateCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(UpdateCommand.prototype, 'error');

		readFile.mockResolvedValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should fail if mesh id is missing', async () => {
		const runResult = UpdateCommand.run([]);

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
		readFile.mockRejectedValueOnce(new Error('File not found'));
		const runResult = UpdateCommand.run(['dummy_mesh_id', 'dummy_file_path']);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "File not found",
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

	test('should not update if user prompt returns false', async () => {
		promptConfirm.mockResolvedValueOnce(false);

		const runResult = await UpdateCommand.run(['sample_merchant', 'valid_mesh_path']);

		expect(runResult).toMatchInlineSnapshot(`"Update cancelled"`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Update cancelled",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should fail if updateMesh method failed', async () => {
		mockUpdateMesh.mockRejectedValueOnce(new Error('dummy_error'));

		const runResult = UpdateCommand.run(['sample_merchant', 'valid_mesh_path']);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to update the mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "dummy_error",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to update the mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should pass with valid args', async () => {
		const runResult = await UpdateCommand.run(['sample_merchant', 'valid_mesh_path']);

		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "status": "success",
		}
	`);
		expect(initRequestId).toHaveBeenCalled();
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
});
