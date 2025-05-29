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
jest.mock('fs');
jest.mock('axios');

jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../lib/smsClient');
jest.mock('../../../classes/logger');

const fs = require('fs');
const path = require('path');
const GetLogForwardingErrorsCommand = require('../config/get/log-forwarding/errors');
const { initSdk, promptConfirm } = require('../../../helpers');
const { getMeshId, getLogForwardingErrors } = require('../../../lib/smsClient');

describe('GetLogForwardingErrorsCommand', () => {
	let parseSpy;
	let logSpy;

	beforeEach(() => {
		logSpy = jest
			.spyOn(GetLogForwardingErrorsCommand.prototype, 'log')
			.mockImplementation(() => {});
		parseSpy = jest
			.spyOn(GetLogForwardingErrorsCommand.prototype, 'parse')
			.mockResolvedValue({ flags: { filename: undefined, ignoreCache: false } });
		jest.spyOn(path, 'extname').mockReturnValue('.csv');
		jest.spyOn(path, 'resolve').mockImplementation((...args) => args.join('/'));
		initSdk.mockResolvedValue({
			imsOrgId: 'orgId',
			imsOrgCode: 'orgCode',
			projectId: 'projectId',
			workspaceId: 'workspaceId',
			workspaceName: 'workspaceName',
		});
		getMeshId.mockResolvedValue('meshId');
		getLogForwardingErrors.mockResolvedValue({
			presignedUrls: ['http://example.com/error1', 'http://example.com/error2'],
			totalSize: 1024,
		});
		jest
			.spyOn(GetLogForwardingErrorsCommand.prototype, 'downloadFileContent')
			.mockImplementation(() => createMockStream(mockLogData));
		fs.existsSync.mockReturnValue(false);
		fs.writeFileSync.mockImplementation(() => {});
		fs.statSync.mockReturnValue({ size: 0 });
		path.extname = jest.fn().mockReturnValue('.csv');
		path.resolve = jest.fn().mockImplementation((...args) => args.join('/'));
		promptConfirm.mockResolvedValue(true);
		global.requestId = 'dummy_request_id';
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('prints log lines to console when no filename provided', async () => {
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(logSpy).toHaveBeenCalledWith('Successfully fetched log forwarding errors.');
		const logCalls = logSpy.mock.calls.map(call => call[0]);
		const logLines = logCalls.filter(line => line.startsWith('> '));
		expect(logLines.length).toBe(6); // 3 lines per file * 2 files
		expect(logLines[0]).toBe('> Error log line 1');
		expect(logLines[1]).toBe('> Error log line 2');
		expect(logLines[2]).toBe('> Error log line 3');
	});

	test('writes to file when filename provided and user confirms', async () => {
		parseSpy.mockResolvedValueOnce({ flags: { filename: 'test.csv', ignoreCache: false } });
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(promptConfirm).toHaveBeenCalledWith(
			'The expected file size is 1.00 KB. Confirm test.csv download? (y/n)',
		);
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining('test.csv'),
			expect.stringContaining('Error log line 1'),
			'utf8',
		);
		expect(logSpy).toHaveBeenCalledWith(
			'Successfully downloaded the log forwarding error logs to test.csv',
		);
	});

	test('does not write file when user declines confirmation', async () => {
		parseSpy.mockResolvedValueOnce({ flags: { filename: 'test.csv', ignoreCache: false } });
		promptConfirm.mockResolvedValueOnce(false);
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(fs.writeFileSync).toHaveBeenCalledTimes(1); // Only the initial empty file creation
		expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('test.csv'), '');
		expect(logSpy).toHaveBeenCalledWith('Log forwarding errors file not downloaded.');
	});

	test('throws error for invalid file extension', async () => {
		parseSpy.mockResolvedValueOnce({ flags: { filename: 'test.txt', ignoreCache: false } });
		path.extname.mockReturnValue('.txt');
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'Invalid file type. Provide a filename with a .csv extension.',
		);
	});

	test('throws error if existing file is not empty', async () => {
		parseSpy.mockResolvedValueOnce({ flags: { filename: 'test.csv', ignoreCache: false } });
		fs.existsSync.mockReturnValue(true);
		fs.statSync.mockReturnValue({ size: 100 });
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow('Make sure the file: test.csv is empty');
	});

	test('creates empty file if it does not exist', async () => {
		parseSpy.mockResolvedValueOnce({ flags: { filename: 'test.csv', ignoreCache: false } });
		fs.existsSync.mockReturnValue(false);
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('test.csv'), '');
	});

	test('throws error if no presignedUrls returned', async () => {
		getLogForwardingErrors.mockResolvedValueOnce({ presignedUrls: [], totalSize: 0 });
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'No log forwarding errors found for the configured destination.',
		);
	});

	test('throws error if totalSize is 0', async () => {
		getLogForwardingErrors.mockResolvedValueOnce({
			presignedUrls: ['http://example.com/error1'],
			totalSize: 0,
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow(
			'No log forwarding error logs available for the configured destination.',
		);
	});

	test('throws error if meshId is not found', async () => {
		getMeshId.mockResolvedValueOnce(null);
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow('Mesh ID not found.');
	});

	test('throws error if getMeshId throws', async () => {
		getMeshId.mockImplementationOnce(() => {
			throw new Error('fail mesh');
		});
		const command = new GetLogForwardingErrorsCommand([], {});
		await expect(command.run()).rejects.toThrow('Unable to get mesh ID: fail mesh.');
	});

	test('handles download failure gracefully', async () => {
		jest
			.spyOn(GetLogForwardingErrorsCommand.prototype, 'downloadFileContent')
			.mockRejectedValueOnce(new Error('Download failed'));
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(logSpy).toHaveBeenCalledWith('Failed to download or process log file: Download failed');
	});

	test('filters out empty lines from content', async () => {
		const mockDataWithEmptyLines = `Line 1\n\nLine 2\n\n\nLine 3\n`;
		jest
			.spyOn(GetLogForwardingErrorsCommand.prototype, 'downloadFileContent')
			.mockImplementation(() => createMockStream(mockDataWithEmptyLines));
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		const logCalls = logSpy.mock.calls.map(call => call[0]);
		const logLines = logCalls.filter(line => line.startsWith('> '));
		expect(logLines.length).toBe(6); // 3 non-empty lines per file * 2 files
		expect(logLines[0]).toBe('> Line 1');
		expect(logLines[1]).toBe('> Line 2');
		expect(logLines[2]).toBe('> Line 3');
	});

	test('calls getLogForwardingErrors with correct parameters', async () => {
		const command = new GetLogForwardingErrorsCommand([], {});
		await command.run();
		expect(getLogForwardingErrors).toHaveBeenCalledWith(
			'orgCode',
			'projectId',
			'workspaceId',
			'meshId',
		);
	});
});

const mockLogData = `Error log line 1\nError log line 2\n\nError log line 3`;

function createMockStream(data) {
	const { Readable } = require('stream');
	const stream = new Readable({
		read() {},
	});
	stream.push(data);
	stream.push(null);
	return stream;
}
