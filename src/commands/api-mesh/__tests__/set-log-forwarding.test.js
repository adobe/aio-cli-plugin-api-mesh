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

const SetLogForwardingCommand = require('../set-log-forwarding');
const {
	initSdk,
	promptConfirm,
	promptSelect,
	promptInput,
	promptInputSecret,
} = require('../../../helpers');
const { getMeshId, setLogForwarding } = require('../../../lib/devConsole');

jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
	promptSelect: jest.fn().mockResolvedValue('newrelic'),
	promptInput: jest.fn().mockResolvedValue('https://log-api.newrelic.com/log/v1'),
	promptInputSecret: jest.fn().mockResolvedValue('abcdef0123456789abcdef0123456789abcdef01'),
}));
jest.mock('../../../lib/devConsole');
jest.mock('../../../classes/logger');

describe('SetLogForwardingCommand', () => {
	let parseSpy;
	let logSpy;

	beforeEach(() => {
		// Setup spies and mock functions
		parseSpy = jest.spyOn(SetLogForwardingCommand.prototype, 'parse').mockResolvedValue({
			flags: {
				ignoreCache: false,
				autoConfirmAction: false,
				json: false,
			},
			args: [], // Empty args since we'll use prompts
		});

		logSpy = jest.spyOn(SetLogForwardingCommand.prototype, 'log');

		initSdk.mockResolvedValue({
			imsOrgId: 'orgId',
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
		getMeshId.mockResolvedValue('meshId');
		setLogForwarding.mockResolvedValue({ success: true });
		global.requestId = 'dummy_request_id';
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	/** Success Case */
	test('sets log forwarding with valid parameters', async () => {
		const command = new SetLogForwardingCommand([], {});
		const result = await command.run();

		expect(promptSelect).toHaveBeenCalledWith('Select log forwarding destination:', ['newrelic']);
		expect(promptInput).toHaveBeenCalledWith('Enter base URI:');
		expect(promptInputSecret).toHaveBeenCalledWith('Enter New Relic license key:');
		expect(setLogForwarding).toHaveBeenCalledWith('orgCode', 'projectId', 'workspaceId', {
			destination: 'newrelic',
			config: {
				baseUri: 'https://log-api.newrelic.com/log/v1',
				licenseKey: 'abcdef0123456789abcdef0123456789abcdef01',
			},
		});
		expect(logSpy).toHaveBeenCalledWith('Log forwarding details set successfully.');
		expect(result).toEqual({
			success: true,
			destination: 'newrelic',
			imsOrgId: 'orgId',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
	});

	/** Error Cases */
	test('throws an error if mesh ID is not found', async () => {
		getMeshId.mockResolvedValueOnce(null);

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Unable to get mesh ID. Please check the details and try again. RequestId: dummy_request_id',
		);
	});

	test('throws an error if set log forwarding call to SMS fails', async () => {
		setLogForwarding.mockRejectedValueOnce(new Error('Failed to set log forwarding'));

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Failed to set log forwarding details. Please try again. RequestId: dummy_request_id',
		);
	});

	/** Input Validation */
	test('throws an error if base URI does not include protocol', async () => {
		promptInput.mockResolvedValueOnce('log-api.newrelic.com/log/v1'); // Missing https://

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'The URI value must include the protocol (https://)',
		);
	});

	test('throws an error if license key has wrong format', async () => {
		promptInputSecret.mockResolvedValueOnce('wrongformat'); // Too short

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'License key has wrong format. Expected: 40 characters (received: 11)',
		);
	});

	/** User Interaction */
	test('prompts for missing destination', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				// No destination provided
				ignoreCache: false,
				autoConfirmAction: false,
				json: false,
			},
			args: [],
		});

		const command = new SetLogForwardingCommand([], {});
		await command.run();

		expect(promptSelect).toHaveBeenCalledWith('Select log forwarding destination:', ['newrelic']);
	});

	test('throws an error if destination selection is cancelled', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				// No destination provided
				ignoreCache: false,
				autoConfirmAction: false,
				json: false,
			},
			args: [],
		});

		promptSelect.mockResolvedValueOnce(null); // User cancels selection

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow('Destination is required');
	});

	test('prompts for missing base URI', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				ignoreCache: false,
				autoConfirmAction: false,
				json: false,
			},
			args: [],
		});

		const command = new SetLogForwardingCommand([], {});
		await command.run();

		expect(promptInput).toHaveBeenCalledWith('Enter base URI:');
	});

	test('prompts for missing license key', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				ignoreCache: false,
				autoConfirmAction: false,
				json: false,
			},
			args: [],
		});

		const command = new SetLogForwardingCommand([], {});
		await command.run();

		expect(promptInputSecret).toHaveBeenCalledWith('Enter New Relic license key:');
	});

	test('throws an error if base URI is empty', async () => {
		promptInput.mockResolvedValueOnce(''); // Empty base URI

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow('Base URI is required');
	});

	test('throws an error if license key is empty', async () => {
		promptInputSecret.mockResolvedValueOnce(''); // Empty license key

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow('License key is required');
	});

	test('returns cancellation message when user declines confirmation', async () => {
		promptConfirm.mockResolvedValueOnce(false); // User declines

		const command = new SetLogForwardingCommand([], {});
		const result = await command.run();

		expect(result).toBe('set-log-forwarding cancelled');
		expect(setLogForwarding).not.toHaveBeenCalled();
	});

	test('logs error message when setLogForwarding fails', async () => {
		const errorMessage = 'API call failed';
		setLogForwarding.mockRejectedValueOnce(new Error(errorMessage));

		const command = new SetLogForwardingCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Failed to set log forwarding details. Please try again. RequestId: dummy_request_id',
		);
		expect(logSpy).toHaveBeenCalledWith(errorMessage);
	});

	/** Flag Handling */
	test('skips confirmation when autoConfirmAction flag is set', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				ignoreCache: false,
				autoConfirmAction: true, // Auto-confirm enabled
				json: false,
			},
			args: [],
		});

		const command = new SetLogForwardingCommand([], {});
		await command.run();

		expect(promptConfirm).not.toHaveBeenCalled();
		expect(setLogForwarding).toHaveBeenCalled();
	});
});
