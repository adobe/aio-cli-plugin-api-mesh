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
const { initSdk, initRequestId } = require('../../../helpers');

const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };

const selectedProject = { id: '5678', title: 'Project01' };

const selectedWorkspace = { id: '123456789', title: 'Workspace01' };

const mockCreateMesh = jest.fn().mockResolvedValue({
	meshId: 'dummy_mesh_id',
	meshConfig: sampleCreateMeshConfig.meshConfig,
});

const mockCreateAPIMeshCredentials = jest.fn().mockResolvedValue({
	apiKey: 'dummy_api_key',
	id: 'dummy_id',
});

const mockSubscribeCredentialToMeshService = jest.fn().mockResolvedValue(['dummy_service']);

const mockSchemaServiceClient = {
	createMesh: mockCreateMesh,
	createAPIMeshCredentials: mockCreateAPIMeshCredentials,
	subscribeCredentialToMeshService: mockSubscribeCredentialToMeshService,
};

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
}));

let logSpy = null;
let errorLogSpy = null;

describe('create command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			schemaServiceClient: mockSchemaServiceClient,
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(CreateCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(CreateCommand.prototype, 'error');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('snapshot create command description', () => {
		expect(CreateCommand.description).toMatchInlineSnapshot(
			`"Create a mesh with the given config."`,
		);
	});

	test('should fail if mesh config file arg is missing', async () => {
		const runResult = CreateCommand.run([]);

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
		const runResult = CreateCommand.run(['invalid_file_path']);

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "ENOENT: no such file or directory, open 'invalid_file_path'",
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
		mockCreateMesh.mockRejectedValueOnce(new Error('create mesh api failed'));

		const runResult = CreateCommand.run(['src/commands/__fixtures__/sample_mesh.json']);

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
		mockCreateAPIMeshCredentials.mockRejectedValueOnce(
			new Error('create api credential api failed'),
		);

		const runResult = CreateCommand.run(['src/commands/__fixtures__/sample_mesh.json']);

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
		mockSubscribeCredentialToMeshService.mockRejectedValueOnce(
			new Error('subscribe credential to mesh service api failed'),
		);

		const runResult = CreateCommand.run(['src/commands/__fixtures__/sample_mesh.json']);

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
		const runResult = await CreateCommand.run(['src/commands/__fixtures__/sample_mesh.json']);

		expect(initRequestId).toHaveBeenCalled();
		expect(mockCreateMesh.mock.calls[0]).toMatchInlineSnapshot(`
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
		expect(mockCreateAPIMeshCredentials.mock.calls[0]).toMatchInlineSnapshot(`
		Array [
		  "1234",
		  "5678",
		  "123456789",
		]
	`);
		expect(mockSubscribeCredentialToMeshService.mock.calls[0]).toMatchInlineSnapshot(`
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
});
