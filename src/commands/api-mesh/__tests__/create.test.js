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
const {
	initSdk,
	initRequestId,
	promptConfirm,
	getFilesInMeshConfig,
	importFiles,
} = require('../../../helpers');
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
	getFilesInMeshConfig: jest.fn().mockReturnValue([]),
	importFiles: jest.fn().mockResolvedValue(),
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

	test('must return proper object structure used by adobe/generator-app-api-mesh', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: {
				json: Promise.resolve(true),
			},
		});
		const output = await CreateCommand.run();
		expect(output).toHaveProperty('mesh');
		expect(output).toHaveProperty('adobeIdIntegrationsForWorkspace');
		expect(output.mesh).toEqual(expect.objectContaining({ meshId: 'dummy_mesh_id' }));
		expect(output.adobeIdIntegrationsForWorkspace).toEqual(
			expect.objectContaining({ apiKey: 'dummy_api_key' }),
		);
	});

	test('snapshot create command description', () => {
		expect(CreateCommand.description).toMatchInlineSnapshot(
			`"Create a mesh with the given config."`,
		);
		expect(CreateCommand.args).toMatchInlineSnapshot(`
		[
		  {
		    "name": "file",
		  },
		]
	`);
		expect(CreateCommand.flags).toMatchInlineSnapshot(`
		{
		  "autoConfirmAction": {
		    "allowNo": false,
		    "char": "c",
		    "default": false,
		    "description": "Auto confirm action prompt. CLI will not check for user approval before executing the action.",
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
		  "json": {
		    "allowNo": false,
		    "default": false,
		    "description": "Output JSON",
		    "parse": [Function],
		    "type": "boolean",
		  },
		}
	`);
		expect(CreateCommand.aliases).toMatchInlineSnapshot(`[]`);
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
		[
		  [
		    "create mesh api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
	});
	test('should create if a valid mesh config file is provided', async () => {
		const runResult = await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(createMesh.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  {
		    "meshConfig": {
		      "sources": [
		        {
		          "handler": {
		            "graphql": {
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
		[
		  "1234",
		  "5678",
		  "123456789",
		]
	`);
		expect(subscribeCredentialToMeshService.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  "dummy_id",
		]
	`);
		expect(runResult).toMatchInlineSnapshot(`
		{
		  "adobeIdIntegrationsForWorkspace": {
		    "apiKey": "dummy_api_key",
		    "id": "dummy_id",
		  },
		  "mesh": {
		    "meshConfig": {
		      "sources": [
		        {
		          "handler": {
		            "graphql": {
		              "endpoint": "<gql_endpoint>",
		            },
		          },
		          "name": "<api_name>",
		        },
		      ],
		    },
		    "meshId": "dummy_mesh_id",
		  },
		  "sdkList": [
		    "dummy_service",
		  ],
		}
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s",
		    "dummy_mesh_id",
		  ],
		  [
		    "To check the status of your mesh, run:",
		  ],
		  [
		    "aio api-mesh:status",
		  ],
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Successfully created API Key %s",
		    "dummy_api_key",
		  ],
		  [
		    "Successfully subscribed API Key %s to API Mesh service",
		    "dummy_api_key",
		  ],
		  [
		    "Mesh Endpoint: %s
		",
		    "https://graph.adobe.io/api/dummy_mesh_id/graphql?api_key=dummy_api_key",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
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
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
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
		[
		  [
		    "ENOENT: no such file or directory, open 'dummy_file_path'",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to read the mesh configuration file provided. Please check the file and try again.",
		  ],
		]
	`);
	});

	test('should fail if create api credential api has failed', async () => {
		createAPIMeshCredentials.mockRejectedValue(new Error('create api credential api failed'));

		const runResult = CreateCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id',
			),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s",
		    "dummy_mesh_id",
		  ],
		  [
		    "To check the status of your mesh, run:",
		  ],
		  [
		    "aio api-mesh:status",
		  ],
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "create api credential api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
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
		[
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s",
		    "dummy_mesh_id",
		  ],
		  [
		    "To check the status of your mesh, run:",
		  ],
		  [
		    "aio api-mesh:status",
		  ],
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Successfully created API Key %s",
		    "dummy_api_key",
		  ],
		  [
		    "subscribe credential to mesh service api failed",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: dummy_request_id",
		  ],
		]
	`);
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
		[
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s",
		    "dummy_mesh_id",
		  ],
		  [
		    "To check the status of your mesh, run:",
		  ],
		  [
		    "aio api-mesh:status",
		  ],
		  [
		    "******************************************************************************************************",
		  ],
		  [
		    "Successfully created API Key %s",
		    "dummy_api_key",
		  ],
		  [
		    "Successfully subscribed API Key %s to API Mesh service",
		    "dummy_api_key",
		  ],
		  [
		    "Mesh Endpoint: %s
		",
		    "https://graph.adobe.io/api/dummy_mesh_id/graphql?api_key=dummy_api_key",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
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
		[
		  [
		    "Create cancelled",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
	});

	test('should pass if there are local files in meshConfig i.e., the file is appended in files array', async () => {
		let meshConfig = {
			sources: [
				{
					name: '<json_source_name>',
					handler: {
						JsonSchema: {
							baseUrl: '<json_source__baseurl>',
							operations: [
								{
									type: 'Query',
									field: '<query>',
									path: '<query_path>',
									method: 'POST',
									requestSchema: './requestParams.json',
								},
							],
						},
					},
				},
			],
			files: [
				{
					path: './requestParams.json',
					content: '{"type":"dummyContent"}',
				},
			],
		};

		createMesh.mockResolvedValue({
			meshId: 'dummy_mesh_id',
			meshConfig: meshConfig,
		});

		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_files.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockReturnValue(['./requestParams.json']);

		importFiles.mockResolvedValueOnce({
			meshConfig,
		});

		const output = await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(createMesh.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  {
		    "meshConfig": {
		      "files": [
		        {
		          "content": "{"type":"dummyContent"}",
		          "path": "./requestParams.json",
		        },
		      ],
		      "sources": [
		        {
		          "handler": {
		            "JsonSchema": {
		              "baseUrl": "<json_source__baseurl>",
		              "operations": [
		                {
		                  "field": "<query>",
		                  "method": "POST",
		                  "path": "<query_path>",
		                  "requestSchema": "./requestParams.json",
		                  "type": "Query",
		                },
		              ],
		            },
		          },
		          "name": "<json_source_name>",
		        },
		      ],
		    },
		  },
		]
	`);
		expect(createAPIMeshCredentials.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		]
		`);

		expect(subscribeCredentialToMeshService.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  "dummy_id",
		]
		`);
		expect(output).toMatchInlineSnapshot(`
		{
		  "adobeIdIntegrationsForWorkspace": {
		    "apiKey": "dummy_api_key",
		    "id": "dummy_id",
		  },
		  "mesh": {
		    "meshConfig": {
		      "files": [
		        {
		          "content": "{"type":"dummyContent"}",
		          "path": "./requestParams.json",
		        },
		      ],
		      "sources": [
		        {
		          "handler": {
		            "JsonSchema": {
		              "baseUrl": "<json_source__baseurl>",
		              "operations": [
		                {
		                  "field": "<query>",
		                  "method": "POST",
		                  "path": "<query_path>",
		                  "requestSchema": "./requestParams.json",
		                  "type": "Query",
		                },
		              ],
		            },
		          },
		          "name": "<json_source_name>",
		        },
		      ],
		    },
		    "meshId": "dummy_mesh_id",
		  },
		  "sdkList": [
		    "dummy_service",
		  ],
		}
	`);
	});

	test('should fail if the file name is more than 25 characters', async () => {
		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_invalid_file_name.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockImplementation(() => {
			throw new Error(
				'Mesh file names must be less than 25 characters. The following file(s) are invalid: requestJSONParameters.json',
			);
		});

		const output = CreateCommand.run();

		await expect(output).rejects.toEqual(new Error('Input mesh config is not valid'));

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Mesh file names must be less than 25 characters. The following file(s) are invalid: requestJSONParameters.json",
		  ],
		]
	`);

		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Input mesh config is not valid",
		  ],
		]
	`);
	});

	test('should fail if the file paths in files array and filenames in sources, transforms, additionalResolvers do not match in mesh config', async () => {
		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_mismatching_path.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockImplementation(() => {
			throw new Error(
				'Please make sure the file requestPaams.json is matching in both places in meshConfig',
			);
		});

		const output = CreateCommand.run();

		await expect(output).rejects.toEqual(new Error('Input mesh config is not valid'));

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Please make sure the file requestPaams.json is matching in both places in meshConfig",
		  ],
		]
	`);

		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Input mesh config is not valid",
		  ],
		]
	`);
	});

	test('should fail if the file is of type other than js, json extension', async () => {
		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_invalid_type.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockImplementation(() => {
			throw new Error(
				'Mesh files must be JavaScript or JSON. Other file types are not supported. The following files are invalid: requestParams.txt',
			);
		});

		const output = CreateCommand.run();

		await expect(output).rejects.toEqual(new Error('Input mesh config is not valid'));

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Mesh files must be JavaScript or JSON. Other file types are not supported. The following files are invalid: requestParams.txt",
		  ],
		]
	`);

		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Input mesh config is not valid",
		  ],
		]
	`);
	});

	test('should fail if the meshConfig and the file are not in the same directory', async () => {
		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_files.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockImplementation(() => {
			throw new Error(
				'Please make sure the files and requestParams.json and sample_mesh_files.json are in the same directory',
			);
		});

		const output = CreateCommand.run();
		await expect(output).rejects.toEqual(new Error('Input mesh config is not valid'));

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Please make sure the files and requestParams.json and sample_mesh_files.json are in the same directory",
		  ],
		]
	`);

		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Input mesh config is not valid",
		  ],
		]
	`);
	});

	test('should fail if import files function fails', async () => {
		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_files.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockReturnValue(['./requestParams.json']);

		importFiles.mockImplementation(() => {
			throw new Error('Error reading the file');
		});

		const output = CreateCommand.run();

		await expect(output).rejects.toEqual(
			new Error(
				'Unable to import the files in the mesh config. Please check the file and try again.',
			),
		);

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Error reading the file",
		  ],
		]
	`);

		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to import the files in the mesh config. Please check the file and try again.",
		  ],
		]
	`);
	});

	test('should not override if prompt returns No, if there is files array', async () => {
		let meshConfig = {
			sources: [
				{
					name: '<json_source_name>',
					handler: {
						JsonSchema: {
							baseUrl: '<json_source__baseurl>',
							operations: [
								{
									type: 'Query',
									field: '<query>',
									path: '<query_path>',
									method: 'POST',
									requestSchema: './requestParams.json',
								},
							],
						},
					},
				},
			],
			files: [
				{
					path: './requestParams.json',
					content: '{"type":"dummyContent"}',
				},
			],
		};

		promptConfirm.mockResolvedValue(false).mockResolvedValue(true);

		createMesh.mockResolvedValue({
			meshId: 'dummy_mesh_id',
			meshConfig: meshConfig,
		});

		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_files.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockReturnValue(['./requestParams.json']);

		importFiles.mockResolvedValueOnce({
			meshConfig,
		});

		const output = await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(createMesh.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  {
		    "meshConfig": {
		      "files": [
		        {
		          "content": "{"type":"dummyContent"}",
		          "path": "./requestParams.json",
		        },
		      ],
		      "sources": [
		        {
		          "handler": {
		            "JsonSchema": {
		              "baseUrl": "<json_source__baseurl>",
		              "operations": [
		                {
		                  "field": "<query>",
		                  "method": "POST",
		                  "path": "<query_path>",
		                  "requestSchema": "./requestParams.json",
		                  "type": "Query",
		                },
		              ],
		            },
		          },
		          "name": "<json_source_name>",
		        },
		      ],
		    },
		  },
		]
	`);
		expect(createAPIMeshCredentials.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		]
	`);

		expect(subscribeCredentialToMeshService.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  "dummy_id",
		]
	`);
		expect(output).toMatchInlineSnapshot(`
		{
		  "adobeIdIntegrationsForWorkspace": {
		    "apiKey": "dummy_api_key",
		    "id": "dummy_id",
		  },
		  "mesh": {
		    "meshConfig": {
		      "files": [
		        {
		          "content": "{"type":"dummyContent"}",
		          "path": "./requestParams.json",
		        },
		      ],
		      "sources": [
		        {
		          "handler": {
		            "JsonSchema": {
		              "baseUrl": "<json_source__baseurl>",
		              "operations": [
		                {
		                  "field": "<query>",
		                  "method": "POST",
		                  "path": "<query_path>",
		                  "requestSchema": "./requestParams.json",
		                  "type": "Query",
		                },
		              ],
		            },
		          },
		          "name": "<json_source_name>",
		        },
		      ],
		    },
		    "meshId": "dummy_mesh_id",
		  },
		  "sdkList": [
		    "dummy_service",
		  ],
		}
	`);
	});

	test('should override if prompt returns Yes, if there is files array', async () => {
		let meshConfig = {
			sources: [
				{
					name: '<json_source_name>',
					handler: {
						JsonSchema: {
							baseUrl: '<json_source__baseurl>',
							operations: [
								{
									type: 'Query',
									field: '<query>',
									path: '<query_path>',
									method: 'POST',
									requestSchema: './requestParams.json',
								},
							],
						},
					},
				},
			],
			files: [
				{
					path: './requestParams.json',
					content: '{"type":"updatedContent"}',
				},
			],
		};

		promptConfirm.mockResolvedValue(true).mockResolvedValue(true);

		createMesh.mockResolvedValue({
			meshId: 'dummy_mesh_id',
			meshConfig: meshConfig,
		});

		parseSpy.mockResolvedValue({
			args: { file: 'src/commands/__fixtures__/sample_mesh_files.json' },
			flags: {
				autoConfirmAction: Promise.resolve(false),
			},
		});

		getFilesInMeshConfig.mockReturnValue(['./requestParams.json']);

		importFiles.mockResolvedValueOnce({
			meshConfig,
		});

		const output = await CreateCommand.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(createMesh.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  {
		    "meshConfig": {
		      "files": [
		        {
		          "content": "{"type":"updatedContent"}",
		          "path": "./requestParams.json",
		        },
		      ],
		      "sources": [
		        {
		          "handler": {
		            "JsonSchema": {
		              "baseUrl": "<json_source__baseurl>",
		              "operations": [
		                {
		                  "field": "<query>",
		                  "method": "POST",
		                  "path": "<query_path>",
		                  "requestSchema": "./requestParams.json",
		                  "type": "Query",
		                },
		              ],
		            },
		          },
		          "name": "<json_source_name>",
		        },
		      ],
		    },
		  },
		]
	`);
		expect(createAPIMeshCredentials.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		]
	`);

		expect(subscribeCredentialToMeshService.mock.calls[0]).toMatchInlineSnapshot(`
		[
		  "1234",
		  "5678",
		  "123456789",
		  "dummy_id",
		]
	`);
		expect(output).toMatchInlineSnapshot(`
		{
		  "adobeIdIntegrationsForWorkspace": {
		    "apiKey": "dummy_api_key",
		    "id": "dummy_id",
		  },
		  "mesh": {
		    "meshConfig": {
		      "files": [
		        {
		          "content": "{"type":"updatedContent"}",
		          "path": "./requestParams.json",
		        },
		      ],
		      "sources": [
		        {
		          "handler": {
		            "JsonSchema": {
		              "baseUrl": "<json_source__baseurl>",
		              "operations": [
		                {
		                  "field": "<query>",
		                  "method": "POST",
		                  "path": "<query_path>",
		                  "requestSchema": "./requestParams.json",
		                  "type": "Query",
		                },
		              ],
		            },
		          },
		          "name": "<json_source_name>",
		        },
		      ],
		    },
		    "meshId": "dummy_mesh_id",
		  },
		  "sdkList": [
		    "dummy_service",
		  ],
		}
	`);
	});
});
