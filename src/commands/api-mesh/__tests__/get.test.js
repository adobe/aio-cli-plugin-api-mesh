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
jest.mock('@adobe/aio-cli-lib-console');
jest.mock('fs/promises');
jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));
jest.mock('@adobe/aio-lib-ims');
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../lib/devConsole');

const mockConsoleCLIInstance = {};
const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };
const selectedProject = { id: '5678', title: 'Project01' };
const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

const { writeFile } = require('fs/promises');
const { initSdk, initRequestId } = require('../../../helpers');
const GetCommand = require('../get');
const mockGetMeshConfig = require('../../__fixtures__/sample_mesh.json');
const { getMeshId, getMesh } = require('../../../lib/devConsole');

let logSpy = null;
let errorLogSpy = null;

let parseSpy = null;

const mockIgnoreCacheFlag = Promise.resolve(true);

describe('get command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(GetCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(GetCommand.prototype, 'error');

		writeFile.mockResolvedValue(true);

		getMeshId.mockResolvedValue('dummy_meshId');
		getMesh.mockResolvedValue({
			meshId: 'dummy_meshId',
			mesh: mockGetMeshConfig,
		});

		parseSpy = jest.spyOn(GetCommand.prototype, 'parse');
		parseSpy.mockResolvedValue({
			args: { file: 'mesh.json' },
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
			},
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot get command', () => {
		expect(GetCommand.description).toMatchInlineSnapshot(`"Get the config of a given mesh"`);
		expect(GetCommand.args).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "name": "file",
		  },
		]
	`);
		expect(GetCommand.flags).toMatchInlineSnapshot(`
		Object {
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
		expect(GetCommand.aliases).toMatchInlineSnapshot(`Array []`);
	});

	test('should fail if mesh id is missing', async () => {
		getMeshId.mockResolvedValue(null);
		const runResult = GetCommand.run();

		return runResult.catch(err => {
			expect(err.message).toMatchInlineSnapshot(
				`"Unable to get mesh config. No mesh found for Org(1234) -> Project(5678) -> Workspace(123456789). Please check the details and try again."`,
			);
			expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
			expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			Array [
			  Array [
			    "Unable to get mesh config. No mesh found for Org(1234) -> Project(5678) -> Workspace(123456789). Please check the details and try again.",
			  ],
			]
		`);
		});
	});

	test('should fail if getMeshId failed', async () => {
		getMeshId.mockRejectedValue(new Error('getMeshId failed'));
		const runResult = GetCommand.run();

		return runResult.catch(err => {
			expect(err.message).toMatchInlineSnapshot(
				`"Unable to get mesh ID. Please check the details and try again. RequestId: dummy_request_id"`,
			);
			expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
			expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			Array [
			  Array [
			    "Unable to get mesh ID. Please check the details and try again. RequestId: dummy_request_id",
			  ],
			]
		`);
		});
	});

	test('should fail if mesh id is not found', async () => {
		getMesh.mockResolvedValueOnce(null);

		const runResult = await GetCommand.run();

		expect(runResult).toMatchInlineSnapshot(`undefined`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to get mesh with the ID dummy_meshId. Please check the mesh ID and try again. RequestId: dummy_request_id",
		    Object {
		      "exit": false,
		    },
		  ],
		]
	`);
	});

	test('should fail if get mesh method failed', async () => {
		getMesh.mockRejectedValueOnce(new Error('get mesh failed'));

		const runResult = GetCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to get mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "get mesh failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to get mesh. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should pass if mesh id is valid', async () => {
		const meshId = 'dummy_meshId';
		getMeshId.mockResolvedValueOnce(meshId);
		const runResult = await GetCommand.run();

		expect(initSdk).toHaveBeenCalledWith({
			ignoreCache: true,
		});
		expect(initRequestId).toHaveBeenCalled();
		expect(runResult).toEqual({ meshId: 'dummy_meshId', mesh: mockGetMeshConfig });
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully retrieved mesh %s",
		    "{
		  \\"meshId\\": \\"dummy_meshId\\",
		  \\"mesh\\": {
		    \\"meshConfig\\": {
		      \\"sources\\": [
		        {
		          \\"name\\": \\"<api_name>\\",
		          \\"handler\\": {
		            \\"graphql\\": {
		              \\"endpoint\\": \\"<gql_endpoint>\\"
		            }
		          }
		        }
		      ]
		    }
		  }
		}",
		  ],
		  Array [
		    "Successfully wrote mesh to file %s",
		    "mesh.json",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should write to file if file argument is provided', async () => {
		writeFile.mockResolvedValueOnce(true);

		const file = './mesh.json';
		parseSpy.mockResolvedValueOnce({
			args: {
				file,
			},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
			},
		});

		const runResult = await GetCommand.run();

		expect(runResult).toEqual({ meshId: 'dummy_meshId', mesh: mockGetMeshConfig });
		expect(writeFile.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "./mesh.json",
		    "{}",
		  ],
		]
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully retrieved mesh %s",
		    "{
		  \\"meshId\\": \\"dummy_meshId\\",
		  \\"mesh\\": {
		    \\"meshConfig\\": {
		      \\"sources\\": [
		        {
		          \\"name\\": \\"<api_name>\\",
		          \\"handler\\": {
		            \\"graphql\\": {
		              \\"endpoint\\": \\"<gql_endpoint>\\"
		            }
		          }
		        }
		      ]
		    }
		  }
		}",
		  ],
		  Array [
		    "Successfully wrote mesh to file %s",
		    "./mesh.json",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should log error if failed to write to file', async () => {
		writeFile.mockRejectedValueOnce(false);

		const file = './mesh.json';
		parseSpy.mockResolvedValueOnce({
			args: {
				file,
			},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
			},
		});
		const runResult = await GetCommand.run();

		expect(runResult).toEqual({ meshId: 'dummy_meshId', mesh: mockGetMeshConfig });
		expect(writeFile.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "./mesh.json",
		    "{}",
		  ],
		]
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully retrieved mesh %s",
		    "{
		  \\"meshId\\": \\"dummy_meshId\\",
		  \\"mesh\\": {
		    \\"meshConfig\\": {
		      \\"sources\\": [
		        {
		          \\"name\\": \\"<api_name>\\",
		          \\"handler\\": {
		            \\"graphql\\": {
		              \\"endpoint\\": \\"<gql_endpoint>\\"
		            }
		          }
		        }
		      ]
		    }
		  }
		}",
		  ],
		  Array [
		    "Unable to write mesh to file %s",
		    "./mesh.json",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});
});
