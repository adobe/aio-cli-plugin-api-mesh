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

const GetLogForwardingCommand = require('../config/get/log-forwarding');
const { initSdk, initRequestId } = require('../../../helpers');
const { getLogForwarding, getMeshId } = require('../../../lib/smsClient');

jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../lib/smsClient');
jest.mock('../../../classes/logger');

describe('GetLogForwardingCommand', () => {
	let logSpy;
	let errorSpy;

	beforeEach(() => {
		jest.spyOn(GetLogForwardingCommand.prototype, 'parse').mockResolvedValue({
			flags: {
				ignoreCache: false, // Set the default value for ignoreCache
				json: false,
			},
			args: [],
		});
		logSpy = jest.spyOn(GetLogForwardingCommand.prototype, 'log');
		errorSpy = jest.spyOn(GetLogForwardingCommand.prototype, 'error').mockImplementation(() => {
			throw new Error(errorSpy.mock.calls[0][0]);
		});

		initRequestId.mockResolvedValue();
		initSdk.mockResolvedValue({
			imsOrgId: 'orgId',
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
		getMeshId.mockResolvedValue('meshId');
		global.requestId = 'dummy_request_id';
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('successfully retrieves log forwarding details', async () => {
		const mockResponse = {
			data: { destination: 'newrelic', config: { baseUri: 'https://example.com' } },
		};
		getLogForwarding.mockResolvedValue(mockResponse);

		const command = new GetLogForwardingCommand([], {});
		const result = await command.run();

		expect(initRequestId).toHaveBeenCalled();
		expect(getMeshId).toHaveBeenCalledWith('orgCode', 'projectId', 'workspaceId', 'workspaceName');
		expect(getLogForwarding).toHaveBeenCalledWith('orgCode', 'projectId', 'workspaceId', 'meshId');
		expect(logSpy).toHaveBeenCalledWith(
			'Successfully retrieved log forwarding details: \n',
			JSON.stringify(mockResponse.data, null, 2),
		);
		expect(result).toEqual({
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
	});

	test('throws an error when getMeshId fails', async () => {
		const errorMessage = 'Failed to fetch mesh ID';
		getMeshId.mockRejectedValue(new Error(errorMessage));

		const command = new GetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			`Unable to get mesh ID. Check the details and try again. RequestId: dummy_request_id`,
		);

		expect(logSpy).toHaveBeenCalledWith(errorMessage);
	});

	test('throws an error when meshId is null', async () => {
		getMeshId.mockResolvedValue(null);

		const command = new GetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			`Unable to get meshId. No mesh found for Org(orgCode) -> Project(projectId) -> Workspace(workspaceId). Check the details and try again.`,
		);
	});

	test('throws an error when getLogForwarding returns null', async () => {
		getLogForwarding.mockResolvedValue(null);

		const command = new GetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Unable to get log forwarding details. Try again. RequestId: dummy_request_id',
		);
	});

	test('throws an error when getLogForwarding fails', async () => {
		const errorMessage = 'Failed to fetch log forwarding details';
		getLogForwarding.mockRejectedValue(new Error(errorMessage));

		const command = new GetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			`Failed to get log forwarding details. Try again. RequestId: dummy_request_id`,
		);

		expect(logSpy).toHaveBeenCalledWith(errorMessage);
	});

	test('handles 404 error when getLogForwarding returns null', async () => {
		// Mock getLogForwarding to simulate a 404 error
		getLogForwarding.mockImplementation(() => {
			const error = new Error('Not Found');
			error.response = { status: 404 };
			throw error;
		});

		const command = new GetLogForwardingCommand([], {});

		await expect(command.run()).rejects.toThrow(
			'Failed to get log forwarding details. Try again. RequestId: dummy_request_id',
		);
		expect(logSpy).toHaveBeenCalledWith('Not Found');
	});

	test('when getLogForwarding returns null', async () => {
		// Mock getLogForwarding to return null
		getLogForwarding.mockResolvedValue(null);

		const command = new GetLogForwardingCommand([], {});

		await expect(command.run()).rejects.toThrow(
			'Unable to get log forwarding details. Try again. RequestId: dummy_request_id',
		);
	});
});
