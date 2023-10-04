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
const { startGraphqlServer } = require('../../../helpers');
require('@adobe-apimesh/mesh-builder');
jest.mock('../../../helpers', () => ({
	initRequestId: jest.fn().mockResolvedValue({}),
	startGraphqlServer: jest.fn().mockResolvedValue({}),
}));

jest.mock('@adobe-apimesh/mesh-builder', () => {
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

const originalEnv = {
	API_MESH_TIER: 'NON-TI',
};

const defaultPort = 5000;
describe('run command tests', () => {
	beforeEach(() => {
		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(RunCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(RunCommand.prototype, 'error');
		parseSpy = jest.spyOn(RunCommand.prototype, 'parse');
	});

	test('snapshot run command description', () => {
		expect(RunCommand.description).toMatchInlineSnapshot(
			`"Run a local development server that builds and compiles a mesh locally"`,
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
		  "debug": {
		    "allowNo": false,
		    "default": false,
		    "description": "Enable debugging mode",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "port": {
		    "char": "p",
		    "description": "Port number for the local dev server",
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
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`[]`);
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

	test('should use the port number provided in the .env file if there is no port in flags', async () => {
		process.env = {
			...originalEnv,
			PORT: 7000,
		};

		const parseOutput = {
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: { debug: false },
		};

		parseSpy.mockResolvedValue(parseOutput);

		await RunCommand.run();
		expect(startGraphqlServer).toHaveBeenCalledWith(expect.anything(), process.env.PORT, false);
	});

	test('should use the default port if port number is not provided explicitly', async () => {
		process.env = {
			...originalEnv,
		};

		const parseOutput = {
			args: { file: 'src/commands/__fixtures__/sample_mesh.json' },
			flags: { debug: false },
		};

		parseSpy.mockResolvedValue(parseOutput);

		await RunCommand.run();
		expect(startGraphqlServer).toHaveBeenCalledWith(expect.anything(), defaultPort, false);
	});
});
