const fs = require('fs');
const ListLogsCommand = require('../log-list');
const { initSdk, promptConfirm } = require('../../../helpers');
const { getMeshId, listLogs } = require('../../../lib/devConsole');

jest.mock('fs');
jest.mock('axios');
jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../lib/devConsole');
jest.mock('../../../classes/logger');

describe('List Logs Command', () => {
	let parseSpy;
	let logSpy;

	beforeEach(() => {
		// Setup spies and mock functions
		parseSpy = jest.spyOn(ListLogsCommand.prototype, 'parse').mockResolvedValue({
			flags: {
				filename: 'test.csv',
				ignoreCache: false,
			},
		});

		logSpy = jest.spyOn(ListLogsCommand.prototype, 'log');

		// initRequestId.mockResolvedValue();
		initSdk.mockResolvedValue({
			imsOrgId: 'orgId',
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
		getMeshId.mockResolvedValue('meshId');
		listLogs.mockResolvedValue([
			{
				rayId: '8c171e8a9a47c16d',
				timestamp: 1726052061861,
				responseStatus: 200,
				level: 'info',
			},
			{
				rayId: '8c171dd35860c16d',
				timestamp: 1726052032540,
				responseStatus: 200,
				level: 'info',
			},
			{
				rayId: '8c171dd22f00c16d',
				timestamp: 1726052032348,
				responseStatus: 200,
				level: 'info',
			},
			{
				rayId: '8c171dd10df2c16d',
				timestamp: 1726052032167,
				responseStatus: 200,
				level: 'info',
			},
		]);

		fs.existsSync.mockReturnValue(false);
		fs.appendFileSync.mockReturnValue();
		promptConfirm.mockResolvedValue(true);
		global.requestId = 'dummy_request_id';
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('Throws an error if filename is not of csv extension', async () => {
		// Mock the file system checks even if they are not the focus of this test
		parseSpy.mockResolvedValueOnce({
			flags: {
				filename: 'test.txt',
				ignoreCache: false,
			},
		});

		const command = new ListLogsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Invalid file type. Provide a filename with a .csv extension.',
		);
	});

	test('Throws an error if file already exists', async () => {
		fs.existsSync.mockReturnValue(true);

		const command = new ListLogsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'File test.csv already exists. Please provide a new file name.',
		);
	});

	test('Throws an error is meshId is not found', async () => {
		getMeshId.mockResolvedValue(null);

		const command = new ListLogsCommand([], {});
		const result = command.run();
		result.catch(err => {
			expect(err.message).toMatchInlineSnapshot(
				`"Unable to get mesh config. No mesh found for Org(orgId) -> Project(projectId) -> Workspace(workspaceId). Please check the details and try again. RequestId: dummy_request_id"`,
			);
		});
	});

	test('Logs are listed successfully with file as output', async () => {
		const command = new ListLogsCommand([], {});
		await command.run();
		expect(fs.appendFileSync).toHaveBeenCalled();
	});

	test('Logs are listed successfully', async () => {
		parseSpy.mockResolvedValue({
			flags: {
				ignoreCache: false,
			},
		});
		const command = new ListLogsCommand([], {});
		await command.run();
		expect(fs.appendFileSync).not.toHaveBeenCalled();
	});

	test('No logs found message displayed when sms returns empty array with file as output', async () => {
		listLogs.mockResolvedValue([]);
		const command = new ListLogsCommand([], {});
		await command.run();
		expect(fs.appendFileSync).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(
			`No recent logs found. Alternatively, you can use the following command to get all logs for a 30 minute time period: \naio api-mesh log-get-bulk --startTime YYYY-MM-DDTHH:MM:SSZ --endTime YYYY-MM-DDTHH:MM:SSZ --filename mesh_logs.csv`,
		);
	});

	test('No logs found message displayed when sms returns empty array', async () => {
		parseSpy.mockResolvedValue({
			flags: {
				ignoreCache: false,
			},
		});
		listLogs.mockResolvedValue([]);
		const command = new ListLogsCommand([], {});
		await command.run();
		expect(logSpy).toHaveBeenCalledWith(
			`No recent logs found. Alternatively, you can use the following command to get all logs for a 30 minute time period: \naio api-mesh log-get-bulk --startTime YYYY-MM-DDTHH:MM:SSZ --endTime YYYY-MM-DDTHH:MM:SSZ --filename mesh_logs.csv`,
		);
		expect(fs.appendFileSync).not.toHaveBeenCalled();
	});

	test('Throw an error if SMS call fails', async () => {
		listLogs.mockRejectedValue(new Error('SMS call failed'));
		const command = new ListLogsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Failed to fetch logs, RequestId: dummy_request_id',
		);
	});
});
