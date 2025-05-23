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

const SetLogForwardingCommand = require('../config/set/log-forwarding');
const crypto = require('crypto');
const {
	initSdk,
	promptConfirm,
	promptSelect,
	promptInput,
	promptInputSecret,
} = require('../../../helpers');
const { getMeshId, setLogForwarding, getPublicEncryptionKey } = require('../../../lib/smsClient');

jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
	promptSelect: jest.fn().mockResolvedValue('New Relic'),
	promptInput: jest.fn().mockResolvedValue('https://log-api.newrelic.com/log/v1'),
	promptInputSecret: jest.fn().mockResolvedValue('abcdef0123456789abcdef0123456789abcdef01'),
}));
jest.mock('../../../lib/smsClient');
jest.mock('../../../classes/logger');

jest.mock('crypto');
// Mock randomBytes for aesKey and iv
const mockAesKey = Buffer.from('mockAesKey');
const mockIv = Buffer.from('mockIv');
const mockEncryptedAesKey = Buffer.from('mockEncryptedAesKey');
const mockCipher = {
	update: jest.fn().mockReturnValueOnce('mockEncryptedData'),
	final: jest.fn().mockReturnValueOnce(''),
};
const mockEncryptedLicenseKey = {
	iv: 'bW9ja0l2',
	key: 'bW9ja0VuY3J5cHRlZEFlc0tleQ==',
	data: 'mockEncryptedData',
};

describe('SetLogForwardingCommand', () => {
	let parseSpy;
	let logSpy;
	let errorSpy;

	beforeEach(() => {
		// Setup spies and mock functions
		parseSpy = jest.spyOn(SetLogForwardingCommand.prototype, 'parse').mockResolvedValue({
			flags: {
				ignoreCache: false,
				autoConfirmAction: false,
				json: false,
			},
			args: [], // Empty args since we are using prompts
		});

		logSpy = jest.spyOn(SetLogForwardingCommand.prototype, 'log');
		errorSpy = jest.spyOn(SetLogForwardingCommand.prototype, 'error').mockImplementation(() => {
			throw new Error(errorSpy.mock.calls[0][0]);
		});

		initSdk.mockResolvedValue({
			imsOrgId: 'orgId',
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
		getMeshId.mockResolvedValue('meshId');
		getPublicEncryptionKey.mockResolvedValue('dummy_public_key');
		setLogForwarding.mockResolvedValue({ success: true, result: true });
		global.requestId = 'dummy_request_id';

		// Reset mockCipher methods
		mockCipher.update.mockReset().mockReturnValueOnce('mockEncryptedData');
		mockCipher.final.mockReset().mockReturnValueOnce('');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Test New Relic destination', () => {
		/** Success Scenario */
		test('sets log forwarding with valid parameters', async () => {
			crypto.randomBytes.mockReturnValueOnce(mockAesKey).mockReturnValueOnce(mockIv);
			crypto.createCipheriv.mockReturnValueOnce(mockCipher);
			crypto.publicEncrypt.mockReturnValueOnce(mockEncryptedAesKey);

			const command = new SetLogForwardingCommand([], {});
			await command.run();

			expect(promptSelect).toHaveBeenCalledWith('Select log forwarding destination:', [
				'New Relic',
			]);
			expect(promptInput).toHaveBeenCalledWith('Enter base URI:');
			expect(promptInputSecret).toHaveBeenCalledWith('Enter license key:');
			expect(setLogForwarding).toHaveBeenCalledWith(
				'orgCode',
				'projectId',
				'workspaceId',
				'meshId',
				{
					destination: 'newrelic',
					config: {
						baseUri: 'https://log-api.newrelic.com/log/v1',
						licenseKey: JSON.stringify(mockEncryptedLicenseKey), // Expect the encrypted value
					},
				},
			);
			expect(logSpy).toHaveBeenCalledWith('Log forwarding set successfully for meshId');
		});

		/** Error Scenarios */
		test('throws an error if mesh ID is not found', async () => {
			getMeshId.mockResolvedValueOnce(null);

			const command = new SetLogForwardingCommand([], {});
			await expect(command.run()).rejects.toThrow(
				'Unable to get meshId. No mesh found for Org(orgCode) -> Project(projectId) -> Workspace(workspaceId). Check the details and try again.',
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

			crypto.randomBytes.mockReturnValueOnce(mockAesKey).mockReturnValueOnce(mockIv);
			crypto.createCipheriv.mockReturnValueOnce(mockCipher);
			crypto.publicEncrypt.mockReturnValueOnce(mockEncryptedAesKey);

			const command = new SetLogForwardingCommand([], {});
			await command.run();

			expect(promptSelect).toHaveBeenCalledWith('Select log forwarding destination:', [
				'New Relic',
			]);
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

			crypto.randomBytes.mockReturnValueOnce(mockAesKey).mockReturnValueOnce(mockIv);
			crypto.createCipheriv.mockReturnValueOnce(mockCipher);
			crypto.publicEncrypt.mockReturnValueOnce(mockEncryptedAesKey);

			const command = new SetLogForwardingCommand([], {});
			await command.run();

			expect(promptConfirm).not.toHaveBeenCalled();
			expect(setLogForwarding).toHaveBeenCalled();
		});

		test('sets log forwarding with auto-confirmation', async () => {
			crypto.randomBytes.mockReturnValueOnce(mockAesKey).mockReturnValueOnce(mockIv);
			crypto.createCipheriv.mockReturnValueOnce(mockCipher);
			crypto.publicEncrypt.mockReturnValueOnce(mockEncryptedAesKey);

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
			expect(setLogForwarding).toHaveBeenCalledWith(
				'orgCode',
				'projectId',
				'workspaceId',
				'meshId',
				{
					destination: 'newrelic',
					config: {
						baseUri: 'https://log-api.newrelic.com/log/v1',
						licenseKey: JSON.stringify(mockEncryptedLicenseKey), // Expect the encrypted value
					},
				},
			);
			expect(logSpy).toHaveBeenCalledWith('Log forwarding set successfully for meshId');
		});

		test('logs error message when setLogForwarding fails', async () => {
			const errorMessage = 'Unable to set log forwarding details';
			setLogForwarding.mockRejectedValueOnce(new Error(errorMessage));

			crypto.randomBytes.mockReturnValueOnce(mockAesKey).mockReturnValueOnce(mockIv);
			crypto.createCipheriv.mockReturnValueOnce(mockCipher);
			crypto.publicEncrypt.mockReturnValueOnce(mockEncryptedAesKey);

			const command = new SetLogForwardingCommand([], {});
			await expect(command.run()).rejects.toThrow(
				'Failed to set log forwarding details. Try again. RequestId: dummy_request_id',
			);
			expect(logSpy).toHaveBeenCalledWith(errorMessage);
		});
	});
});
