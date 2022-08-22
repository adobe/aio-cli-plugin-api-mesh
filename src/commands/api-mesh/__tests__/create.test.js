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

const CreateCommand = require('../create');
const sampleCreateMeshConfig = require('../../__fixtures__/sample_mesh.json');
const { initSdk, initRequestId, promptConfirm } = require('../../../helpers');
const {
	createMesh,
	createAPIMeshCredentials,
	subscribeCredentialToMeshService,
} = require('../../../lib/devConsole');

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };

const selectedProject = { id: '5678', title: 'Project01' };

const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));

jest.mock('axios');
jest.mock('@adobe/aio-lib-ims');
jest.mock('@adobe/aio-lib-env');
jest.mock('@adobe/aio-cli-lib-console');
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../lib/devConsole');

let logSpy = null;
let errorLogSpy = null;

let parseSpy = null;

const mockIgnoreCacheFlag = Promise.resolve(true);
const mockAutoApproveAction = Promise.resolve(false);

describe('create command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(CreateCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(CreateCommand.prototype, 'error');

		createMesh.mockResolvedValue({
			meshId: 'dummy_mesh_id',
			meshConfig: sampleCreateMeshConfig.meshConfig,
		});
		createAPIMeshCredentials.mockResolvedValue({
			apiKey: 'dummy_api_key',
			id: 'dummy_id',
		});
		subscribeCredentialToMeshService.mockResolvedValue(['dummy_service']);

		parseSpy = jest.spyOn(CreateCommand.prototype, 'parse');
		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
			},
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot create command description', () => {
		expect(CreateCommand.description).toMatchInlineSnapshot(
			`"Create a mesh with the given config."`,
		);
		expect(CreateCommand.args).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "name": "file",
		  },
		]
	`);
		expect(CreateCommand.flags).toMatchInlineSnapshot(`
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
		expect(CreateCommand.aliases).toMatchInlineSnapshot(`Array []`);
	});

	test('should fail if mesh config file arg is missing', async () => {
		parseSpy.mockResolvedValueOnce({
			args: {},
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
			},
		});
		const runResult = CreateCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error('Missing file path. Run aio api-mesh create --help for more info.'),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Missing file path. Run aio api-mesh create --help for more info.",
		  ],
		]
	`);
	});

	test('should fail if mesh file is invalid', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'dummy_file_path' },
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: mockAutoApproveAction,
			},
		});
		const runResult = CreateCommand.run();

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

	test('should fail if create mesh api has failed', async () => {
		createMesh.mockRejectedValueOnce(new Error('create mesh api failed'));

		const runResult = CreateCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "create mesh api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should fail if create api credential api has failed', async () => {
		createAPIMeshCredentials.mockRejectedValueOnce(new Error('create api credential api failed'));

		const runResult = CreateCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully created mesh %s",
		    "dummy_mesh_id",
		  ],
		  Array [
		    "{
		  \\"meshId\\": \\"dummy_mesh_id\\",
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
		}",
		  ],
		  Array [
		    "create api credential api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should fail if subscribe credential to mesh service api has failed', async () => {
		subscribeCredentialToMeshService.mockRejectedValueOnce(
			new Error('subscribe credential to mesh service api failed'),
		);

		const runResult = CreateCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully created mesh %s",
		    "dummy_mesh_id",
		  ],
		  Array [
		    "{
		  \\"meshId\\": \\"dummy_mesh_id\\",
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
		}",
		  ],
		  Array [
		    "Successfully created API Key %s",
		    "dummy_api_key",
		  ],
		  Array [
		    "subscribe credential to mesh service api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});

	test('should create if a valid mesh config file is provided', async () => {
		const runResult = await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(createMesh.mock.calls[0]).toMatchInlineSnapshot(`
		Array [
		  "1234",
		  "5678",
		  "123456789",
		  Object {
		    "meshConfig": Object {
		      "sources": Array [
		        Object {
		          "handler": Object {
		            "graphql": Object {
		              "endpoint": "<gql_endpoint>",
		            },
		          },
		          "name": "<api_name>",
		        },
		      ],
		    },
		  },
		]
	`);
		expect(createAPIMeshCredentials.mock.calls[0]).toMatchInlineSnapshot(`
		Array [
		  "1234",
		  "5678",
		  "123456789",
		]
	`);
		expect(subscribeCredentialToMeshService.mock.calls[0]).toMatchInlineSnapshot(`
		Array [
		  "1234",
		  "5678",
		  "123456789",
		  "dummy_id",
		]
	`);
		expect(runResult).toMatchInlineSnapshot(`
		Object {
		  "adobeIdIntegrationsForWorkspace": Object {
		    "apiKey": "dummy_api_key",
		    "id": "dummy_id",
		  },
		  "mesh": Object {
		    "meshConfig": Object {
		      "sources": Array [
		        Object {
		          "handler": Object {
		            "graphql": Object {
		              "endpoint": "<gql_endpoint>",
		            },
		          },
		          "name": "<api_name>",
		        },
		      ],
		    },
		    "meshId": "dummy_mesh_id",
		  },
		  "sdkList": Array [
		    "dummy_service",
		  ],
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully created mesh %s",
		    "dummy_mesh_id",
		  ],
		  Array [
		    "{
		  \\"meshId\\": \\"dummy_mesh_id\\",
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
		}",
		  ],
		  Array [
		    "Successfully created API Key %s",
		    "dummy_api_key",
		  ],
		  Array [
		    "Successfully subscribed API Key %s to API Mesh service",
		    "dummy_api_key",
		  ],
		  Array [
		    "Mesh Endpoint: %s
		",
		    "https://graph.adobe.io/api/dummy_mesh_id/graphql?api_key=dummy_api_key",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should not ask for confirmation if autoConfirmAction is provided', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
				autoConfirmAction: Promise.resolve(true),
			},
		});

		await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(promptConfirm).not.toHaveBeenCalled();
		expect(initSdk).toHaveBeenCalledWith({
			ignoreCache: true,
		});
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Successfully created mesh %s",
		    "dummy_mesh_id",
		  ],
		  Array [
		    "{
		  \\"meshId\\": \\"dummy_mesh_id\\",
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
		}",
		  ],
		  Array [
		    "Successfully created API Key %s",
		    "dummy_api_key",
		  ],
		  Array [
		    "Successfully subscribed API Key %s to API Mesh service",
		    "dummy_api_key",
		  ],
		  Array [
		    "Mesh Endpoint: %s
		",
		    "https://graph.adobe.io/api/dummy_mesh_id/graphql?api_key=dummy_api_key",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});

	test('should stop creation if user declines confirmation', async () => {
		promptConfirm.mockResolvedValueOnce(false);

		await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(promptConfirm).toHaveBeenCalled();
		expect(initSdk).toHaveBeenCalledWith({
			ignoreCache: true,
		});
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "Create cancelled",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`Array []`);
	});
});
