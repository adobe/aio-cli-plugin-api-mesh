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
const { initSdk } = require('../../../helpers');
const FetchLogsCommand = require('../log-get');
const { getLogsByRayId, getMeshId } = require('../../../lib/devConsole');
const os = require('os');
let logSpy = null;
let errorLogSpy = null;
let parseSpy = null;
let platformSpy = null;

const mockIgnoreCacheFlag = Promise.resolve(true);

describe('FetchLogsCommand tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			imsOrgId: selectedOrg.id,
			projectId: selectedProject.id,
			workspaceId: selectedWorkspace.id,
			workspaceName: selectedWorkspace.title,
		});

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(FetchLogsCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(FetchLogsCommand.prototype, 'error');
		platformSpy = jest.spyOn(os, 'platform');

		writeFile.mockResolvedValue(true);

		parseSpy = jest.spyOn(FetchLogsCommand.prototype, 'parse');
		parseSpy.mockResolvedValue({
			args: { rayId: 'ray1' },
			flags: {
				ignoreCache: mockIgnoreCacheFlag,
			},
		});
		getMeshId.mockResolvedValue('12345');
		getLogsByRayId.mockResolvedValue({
			'EventTimestampMs': 123456789,
			'Exceptions': 'None',
			'Logs': 'Log data',
			'Outcome': 'Success',
			'meshId': 'mesh1',
			'rayId': 'ray1',
			'URL': 'http://example.com',
			'Request Method': 'GET',
			'Response Status': 200,
		});
	});

	afterEach(() => {
		platformSpy.mockRestore();
	});

	test('snapshot FetchLogsCommand', () => {
		expect(FetchLogsCommand.description).toMatchInlineSnapshot(
			`"Get the Log of a given mesh by RayId"`,
		);
		expect(FetchLogsCommand.args).toMatchInlineSnapshot(`
		[
		  {
		    "description": "Fetch a single log by rayID",
		    "name": "rayId",
		    "required": true,
		  },
		]
	`);
		expect(FetchLogsCommand.flags).toMatchInlineSnapshot(`
		                {
		                  "ignoreCache": {
		                    "allowNo": false,
		                    "char": "i",
		                    "default": false,
		                    "description": "Ignore cache and force manual org -> project -> workspace selection",
		                    "parse": [Function],
		                    "type": "boolean",
		                  },
		                }
	        `);
		expect(FetchLogsCommand.aliases).toMatchInlineSnapshot(`[]`);
	});
});

test('should handle log not found error', async () => {
	getLogsByRayId.mockRejectedValue(new Error('LogNotFound'));

	const runResult = FetchLogsCommand.run();

	return runResult.catch(err => {
		expect(err.message).toMatchInlineSnapshot(`
		"No logs found for RayID ray1. Check the RayID and try again. RequestId: dummy_request_id. Alternatively, you can use the following command to get all logs for a 30 minute time period: 
		aio api-mesh log-get-bulk --startTime YYYY-MM-DDTHH:MM:SSZ --endTime YYYY-MM-DDTHH:MM:SSZ --filename mesh_logs.csv"
	`);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "No logs found for RayID ray1. Check the RayID and try again. RequestId: dummy_request_id. Alternatively, you can use the following command to get all logs for a 30 minute time period: 
		aio api-mesh log-get-bulk --startTime YYYY-MM-DDTHH:MM:SSZ --endTime YYYY-MM-DDTHH:MM:SSZ --filename mesh_logs.csv",
		  ],
		]
	`);
	});
});

test('should handle server error', async () => {
	getLogsByRayId.mockRejectedValue(new Error('ServerError'));

	const runResult = FetchLogsCommand.run();

	return runResult.catch(err => {
		expect(err.message).toMatchInlineSnapshot(
			`"Server error while fetching logs for RayId ray1. Please try again later. RequestId: dummy_request_id"`,
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Server error while fetching logs for RayId ray1. Please try again later. RequestId: dummy_request_id",
		  ],
		]
	`);
	});
});

test('should handle generic error', async () => {
	getLogsByRayId.mockRejectedValue({
		response: { status: 503, statusText: 'Service Unavailable' },
	});

	const runResult = FetchLogsCommand.run();

	return runResult.catch(err => {
		expect(err.message).toMatchInlineSnapshot(
			`"Unable to get mesh logs. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id"`,
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
			[
			  [
			    "Unable to get mesh logs. Please check the details and try again. If the error persists please contact support. RequestId: dummy_request_id",
			  ],
			]
		`);
	});
});

test('should handle mesh ID not found error', async () => {
	getMeshId.mockResolvedValue(null);

	const runResult = FetchLogsCommand.run();

	return runResult.catch(err => {
		expect(err.message).toMatchInlineSnapshot(
			`"Unable to get mesh ID. Please check the details and try again. RequestId: dummy_request_id"`,
		);
		expect(logSpy.mock.calls).toMatchInlineSnapshot(`[]`);
		expect(errorLogSpy.mock.calls).toMatchInlineSnapshot(`
		[
		  [
		    "Unable to get mesh ID. Please check the details and try again. RequestId: dummy_request_id",
		  ],
		]
	`);
	});
});
test('should fetch logs successfully', async () => {
	getMeshId.mockResolvedValue('mesh1');
	getLogsByRayId.mockResolvedValue({
		eventTimestampMs: 1724660420904,
		exceptions: '[]',
		logs:
			'[{\'Level\': \'log\', \'Message\': [\'[object Object]\'], \'TimestampMs\': 1724660422580}, {\'Level\': \'log\', \'Message\': [\'{"sources":[{"name":"venia","handler":{"graphql":{"useGETForQueries":true,"endpoint":"https://venia.magento.com/graphql","operationHeaders":{"x-test-header":"{context.headers[\\\'x-test-header\\\']}"}}}}],"responseConfig":{"includeHTTPDetails":true},"additionalResolvers":[],"plugins":[{"httpDetailsExtensions":{}}]}\'], \'TimestampMs\': 1724660422580}]',
		outcome: 'ok',
		meshId: 'mesh1',
		rayId: 'ray1',
		url: 'https://edge-dev1-graph.adobe.io/api/REDACTED/graphql',
		requestMethod: 'POST',
		responseStatus: 200,
		level: 'log',
	});

	const command = new FetchLogsCommand(['ray1']);
	await command.run();

	expect(logSpy).toHaveBeenCalledWith('Event Timestamp : %s', 1724660420904);
	expect(logSpy).toHaveBeenCalledWith('Exceptions : %s', '[]');
	expect(logSpy).toHaveBeenCalledWith(
		'Logs : %s',
		'[{\'Level\': \'log\', \'Message\': [\'[object Object]\'], \'TimestampMs\': 1724660422580}, {\'Level\': \'log\', \'Message\': [\'{"sources":[{"name":"venia","handler":{"graphql":{"useGETForQueries":true,"endpoint":"https://venia.magento.com/graphql","operationHeaders":{"x-test-header":"{context.headers[\\\'x-test-header\\\']}"}}}}],"responseConfig":{"includeHTTPDetails":true},"additionalResolvers":[],"plugins":[{"httpDetailsExtensions":{}}]}\'], \'TimestampMs\': 1724660422580}]',
	);
	expect(logSpy).toHaveBeenCalledWith('Outcome : %s', 'ok');
	expect(logSpy).toHaveBeenCalledWith('MeshId : %s', 'mesh1');
	expect(logSpy).toHaveBeenCalledWith('RayId : %s', 'ray1');
	expect(logSpy).toHaveBeenCalledWith(
		'MeshUrl : %s',
		'https://edge-dev1-graph.adobe.io/api/REDACTED/graphql',
	);
	expect(logSpy).toHaveBeenCalledWith('Request Method : %s', 'POST');
	expect(logSpy).toHaveBeenCalledWith('Request Status : %s', 200);
});
