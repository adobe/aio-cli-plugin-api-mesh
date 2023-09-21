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

jest.mock('../../../helpers', () => ({
	initRequestId: jest.fn().mockResolvedValue({}),
}));

const RunCommand = require('../run');
const { initRequestId } = require('../../../helpers');

let logSpy = null;
let errorLogSpy = null;

describe('run command tests', () => {
	beforeEach(() => {
		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(RunCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(RunCommand.prototype, 'error');
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
		    "required": true,
		  },
		]
	`);

		expect(RunCommand.flags).toMatchInlineSnapshot(`
		{
		  "debug": {
		    "allowNo": false,
		    "description": "Enable debugging mode",
		    "parse": [Function],
		    "type": "boolean",
		  },
		  "port": {
		    "char": "p",
		    "default": 5000,
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
        
        const runResult = RunCommand.run();

    });
});
