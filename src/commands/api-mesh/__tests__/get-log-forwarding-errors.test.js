const fs = require('fs');
const path = require('path');
const GetLogForwardingErrorsCommand = require('../config/get/log-forwarding/errors');
const { initSdk, promptConfirm } = require('../../../helpers');
const { getMeshId, getLogForwardingErrors } = require('../../../lib/smsClient');

jest.mock('fs');
jest.mock('axios');
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../lib/smsClient');
jest.mock('../../../classes/logger');

describe('GetLogForwardingErrorsCommand', () => {
	let parseSpy;

	beforeEach(() => {
		const now = new Date();
		const startTime = new Date(now);
		const endTime = new Date(now);
		startTime.setMinutes(startTime.getMinutes() - 2);
		const formattedStartTime = startTime.toISOString().slice(0, 19) + 'Z';
		const formattedEndTime = endTime.toISOString().slice(0, 19) + 'Z';

		parseSpy = jest.spyOn(GetLogForwardingErrorsCommand.prototype, 'parse').mockResolvedValue({
			flags: {
				startTime: formattedStartTime,
				endTime: formattedEndTime,
				filename: 'test.csv',
				ignoreCache: false,
			},
		});

		initSdk.mockResolvedValue({
			imsOrgId: 'orgId',
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
		getMeshId.mockResolvedValue('meshId');
		getLogForwardingErrors.mockResolvedValue({
			errorUrls: [{ key: 'error1.csv', url: 'http://example.com/someHash' }],
			totalSize: 2048,
		});
		promptConfirm.mockResolvedValue(true);
		global.requestId = 'dummy_request_id';
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('throws an error if the time difference between startTime and endTime is greater than 30 minutes', async () => {
		fs.existsSync.mockReturnValue(true);
		fs.statSync.mockReturnValue({ size: 0 });
		const now = new Date();
		const startTime = new Date(now);
		const endTime = new Date(now);
		startTime.setMinutes(startTime.getMinutes() - 45);
		const formattedStartTime = startTime.toISOString().slice(0, 19) + 'Z';
		const formattedEndTime = endTime.toISOString().slice(0, 19) + 'Z';
		parseSpy.mockResolvedValueOnce({
			flags: {
				startTime: formattedStartTime,
				endTime: formattedEndTime,
				filename: 'test.csv',
				ignoreCache: false,
			},
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'The maximum duration between startTime and endTime is 30 minutes. The current duration is 0 hours 45 minutes and 0 seconds.',
		);
	});

	test('throws an error if the endTime is greater than current time(now)', async () => {
		fs.existsSync.mockReturnValue(true);
		fs.statSync.mockReturnValue({ size: 0 });
		const now = new Date();
		const startTime = new Date(now);
		const endTime = new Date(now);
		endTime.setMinutes(startTime.getMinutes() + 45);
		const formattedStartTime = startTime.toISOString().slice(0, 19) + 'Z';
		const formattedEndTime = endTime.toISOString().slice(0, 19) + 'Z';
		parseSpy.mockResolvedValueOnce({
			flags: {
				startTime: formattedStartTime,
				endTime: formattedEndTime,
				filename: 'test.csv',
				ignoreCache: false,
			},
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'endTime cannot be in the future. Provide a valid endTime.',
		);
	});

	test('throws an error if startTime format is invalid', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				startTime: '20241213223832',
				endTime: '2024-08-29T12:30:00Z',
				filename: 'test.csv',
			},
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		const correctedStartTime = '2024-12-13T22:38:32Z';
		await expect(command.run()).rejects.toThrow(
			`Use the format YYYY-MM-DDTHH:MM:SSZ for startTime. Did you mean ${correctedStartTime}?`,
		);
	});

	test('throws an error if endTime format is invalid', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				startTime: '2024-08-29T12:00:00Z',
				endTime: '2024-08-29:23:45:56Z',
				filename: 'test.csv',
			},
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		const correctedEndTime = '2024-08-29T23:45:56Z';
		await expect(command.run()).rejects.toThrow(
			`Use the format YYYY-MM-DDTHH:MM:SSZ for endTime. Did you mean ${correctedEndTime}?`,
		);
	});

	test('throws an error if totalSize is 0', async () => {
		fs.existsSync.mockReturnValue(true);
		fs.statSync.mockReturnValue({ size: 0 });
		getLogForwardingErrors.mockResolvedValueOnce({
			errorUrls: [{ key: 'error1', url: 'http://example.com/error1' }],
			totalSize: 0,
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow('No log forwarding errors available to download');
	});

	test('throws an error if errors are requested for a date older than 30 days', async () => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);
		const startTime = new Date(thirtyDaysAgo);
		startTime.setUTCDate(thirtyDaysAgo.getUTCDate() - 1);
		const formattedStartTime = startTime.toISOString().slice(0, 19) + 'Z';
		parseSpy.mockResolvedValueOnce({
			flags: {
				startTime: formattedStartTime,
				endTime: '2024-08-30T12:30:00Z',
				filename: 'test.csv',
			},
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Cannot get logs more than 30 days old. Adjust your time range.',
		);
	});

	test('creates file if it does not exist and checks if file is empty before proceeding', async () => {
		fs.existsSync.mockReturnValue(false);
		fs.statSync.mockReturnValue({ size: 0 });
		const mockWriteStream = {
			write: jest.fn(),
			end: jest.fn(),
			on: jest.fn((event, callback) => {
				if (event === 'finish') {
					callback();
				}
			}),
		};
		fs.createWriteStream.mockReturnValue(mockWriteStream);
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(fs.existsSync).toHaveBeenCalledWith(path.resolve(process.cwd(), 'test.csv'));
		expect(fs.writeFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), 'test.csv'), '');
		expect(mockWriteStream.write).toHaveBeenCalled();
	});

	test('throws an error if the file is not empty', async () => {
		fs.existsSync.mockReturnValue(true);
		fs.statSync.mockReturnValue({ size: 1024 });
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow('Make sure the file: test.csv is empty');
	});

	test('downloads errors if all conditions are met', async () => {
		fs.existsSync.mockReturnValue(true);
		fs.statSync.mockReturnValue({ size: 0 });
		const mockWriteStream = {
			write: jest.fn(),
			end: jest.fn(),
			on: jest.fn((event, callback) => {
				if (event === 'finish') {
					callback();
				}
			}),
		};
		fs.createWriteStream.mockReturnValue(mockWriteStream);
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(initSdk).toHaveBeenCalled();
		expect(getMeshId).toHaveBeenCalledWith('orgCode', 'projectId', 'workspaceId', 'workspaceName');
		expect(getLogForwardingErrors).toHaveBeenCalledWith(
			'orgCode',
			'projectId',
			'workspaceId',
			'meshId',
			expect.any(String),
			expect.any(String),
		);
		expect(fs.createWriteStream).toHaveBeenCalledWith(path.resolve(process.cwd(), 'test.csv'), {
			flags: 'a',
		});
		expect(mockWriteStream.write).toHaveBeenCalled();
		expect(mockWriteStream.end).toHaveBeenCalled();
	});
});
