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

const RunCommand = require('../run');
const { 
	startGraphqlServer,
	interpolateMesh,
	importFiles, 
} = require('../../../helpers');
require('@testmeshbuilder/mesh-builder');
jest.mock('../../../helpers', () => ({
	initRequestId: jest.fn().mockResolvedValue({}),
	startGraphqlServer: jest.fn().mockResolvedValue({}),
	interpolateMesh: jest.fn().mockResolvedValue({}),
	importFiles: jest.fn().mockResolvedValue(),
}));

jest.mock('@testmeshbuilder/mesh-builder', () => {
	return {
		default: {
			validateMesh: jest.fn().mockResolvedValue({}),
			buildMesh: jest.fn().mockResolvedValue({}),
			compileMesh: jest.fn().mockResolvedValue({}),
		},
	};
});

let logSpy = null;
let errorLogSpy = null;
let parseSpy = null;

describe('run command tests', () => {
	beforeEach(() => {
		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(RunCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(RunCommand.prototype, 'error');
		parseSpy = jest.spyOn(RunCommand.prototype, 'parse');
	});

	test('snapshot run command description', () => {
		expect(RunCommand.description).toMatchInlineSnapshot(
			`"Run a local development server using mesh built and compiled locally"`,
		);
		expect(RunCommand.summary).toMatchInlineSnapshot(`"Run local development server"`);
		expect(RunCommand.args).toMatchInlineSnapshot(`
		[
		  {
		    "description": "Mesh File",
		    "name": "file",
		  },
		]
	`);

		expect(RunCommand.flags).toMatchInlineSnapshot(`
		{
		  "autoConfirmAction": {
		    "allowNo": false,
		    "char": "c",
		    "default": false,
		    "description": "Auto confirm action prompt. CLI will not check for user approval before executing the action.",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "debug": {
		    "allowNo": false,
		    "default": false,
		    "description": "Enable debugging mode",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "env": {
		    "char": "e",
		    "default": ".env",
		    "description": "Path to env file",
		    "input": [],
		    "multiple": false,
		    "parse": [Function],
		    "type": "option",
		  },
		  "port": {
		    "char": "p",
		    "description": "Port number of local dev server",
		    "input": [],
		    "multiple": false,
		    "parse": [Function],
		    "type": "option",
		  },
		}
	`);
		expect(RunCommand.aliases).toMatchInlineSnapshot(`[]`);
	});

	test('should fail if mesh file is not provided', async () => {
		parseSpy.mockResolvedValue({
			args: {},
			flags: {},
		});

		const runResult = RunCommand.run();
		await expect(runResult).rejects.toEqual(
			new Error('Missing file path. Run aio api-mesh run --help for more info.'),
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Missing file path. Run aio api-mesh run --help for more info.",
		  ],
		]
	`);
	});

	test('should use the port number provided in the flags for starting the server', async () => {
		const parseOutput = {
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: { port: 6000, debug: false },
		};

		parseSpy.mockResolvedValue(parseOutput);

		await RunCommand.run();
		expect(startGraphqlServer).toHaveBeenCalledWith(
			expect.anything(),
			parseOutput.flags.port,
			false,
		);
	});

	test('should use the port number provided in the .env file if there is no port', async () => {
		process.env.PORT = 7000;
		const parseOutput = {
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: { debug: false },
		};

		parseSpy.mockResolvedValue(parseOutput);

		await RunCommand.run();
		expect(startGraphqlServer).toHaveBeenCalledWith(expect.anything(), process.env.PORT, false);
	});

	test('should return error for run command if the mesh has placeholders and env file provided using --env flag is not found', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh_with_placeholder' },
			flags: {
				env: 'src/commands/__fixtures__/.env_nonExisting',
			},
		});
		const runResult = RunCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				'Unable to read the file src/commands/__fixtures__/.env_nonExisting. Please check the file and try again.',
			),
		);

		expect(logSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "The provided mesh contains placeholders. Starting mesh interpolation process.",
		  ],
		  [
		    "ENOENT: no such file or directory, open 'src/commands/__fixtures__/.env_nonExisting'",
		  ],
		]
	`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to read the file src/commands/__fixtures__/.env_nonExisting. Please check the file and try again.",
		  ],
		]
	`);
	});

	test('should return error for run command if mesh has placeholders and the provided env file is invalid', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh_with_placeholder' },
			flags: {
				env: 'src/commands/__fixtures__/env_invalid',
			},
		});

		const runResult = RunCommand.run();

		await expect(runResult).rejects.toEqual(
			new Error(
				"Issue in src/commands/__fixtures__/env_invalid file - Duplicate key << key1 >> on line 3,Invalid format for key/value << key2=='value3' >> on line 5,Invalid format << key3 >> on line 6,Invalid format for key/value << key4='value4 >> on line 7",
			),
		);

		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Issue in src/commands/__fixtures__/env_invalid file - Duplicate key << key1 >> on line 3,Invalid format for key/value << key2=='value3' >> on line 5,Invalid format << key3 >> on line 6,Invalid format for key/value << key4='value4 >> on line 7",
		  ],
		]
	`);
	});

	test('should return error for run command if the mesh has placeholders and the provided env file is valid but there are missing keys found in mesh interpolation', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh_with_placeholder' },
			flags: {
				env: 'src/commands/__fixtures__/env_valid',
			},
		});

		interpolateMesh.mockResolvedValueOnce({
			interpolationStatus: 'failed',
			missingKeys: ['newKey1', 'newKey2'],
			interpolatedMesh: '',
		});

		const runResult = RunCommand.run();
		await expect(runResult).rejects.toEqual(
			new Error('The mesh file cannot be interpolated due to missing keys : newKey1 , newKey2'),
		);

		await expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "The mesh file cannot be interpolated due to missing keys : newKey1 , newKey2",
		  ],
		]
	`);
	});

	test('should return error for run command if the provided env file is valid and mesh interpolation is successful but interpolated mesh is not a valid JSON', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh_with_placeholder' },
			flags: {
				env: 'src/commands/__fixtures__/env_valid',
			},
		});

		//sampleInterpolated mesh where value of responseConfig.includeHTTPDetails is invalid i.e. non-boolean
		const sampleInterpolatedMesh =
			'{"meshConfig":{"sources":[{"name":"<api-name>","handler":{"graphql":{"endpoint":"<api-url>"}}}],"responseConfig":{"includeHTTPDetails":sample}}}';

		interpolateMesh.mockResolvedValueOnce({
			interpolationStatus: 'success',
			missingKeys: [],
			interpolatedMeshData: sampleInterpolatedMesh,
		});

		const runResult = RunCommand.run();
		await expect(runResult).rejects.toEqual(
			new Error('Interpolated mesh is not a valid JSON. Please check the generated json file.'),
		);

		await expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Interpolated mesh is not a valid JSON. Please check the generated json file.",
		  ],
		]
	`);
	});

	test('should successfully run the mesh if provided env file is valid, mesh interpolation is successful and interpolated mesh is a valid JSON', async () => {
		parseSpy.mockResolvedValueOnce({
			args: { file: 'src/commands/__fixtures__/sample_mesh_with_placeholder' },
			flags: {
				env: 'src/commands/__fixtures__/env_valid',
			},
		});

		//sampleInterpolated mesh where the mesh string is a valid JSON
		const sampleInterpolatedMesh =
			'{"meshConfig":{"sources":[{"name":"<api-name>","handler":{"graphql":{"endpoint":"<api-url>"}}}],"responseConfig":{"includeHTTPDetails":true}}}';

		interpolateMesh.mockResolvedValueOnce({
			interpolationStatus: 'success',
			missingKeys: [],
			interpolatedMeshData: sampleInterpolatedMesh,
		});

		const runResult = await RunCommand.run();
		expect(startGraphqlServer).toHaveBeenCalledWith(expect.anything(), process.env.PORT, false);
	});
});
