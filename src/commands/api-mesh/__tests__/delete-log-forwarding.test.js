const DeleteLogForwardingCommand = require('../config/delete/log-forwarding');
const { initSdk, promptConfirm } = require('../../../helpers');
const { getMeshId, deleteLogForwarding } = require('../../../lib/smsClient');

jest.mock('../../../helpers', () => ({
	initSdk: jest.fn().mockResolvedValue({}),
	initRequestId: jest.fn().mockResolvedValue({}),
	promptConfirm: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../lib/smsClient');

let logSpy, errorLogSpy, parseSpy;

describe('delete log forwarding command tests', () => {
	beforeEach(() => {
		initSdk.mockResolvedValue({
			imsOrgCode: 'mockOrgCode',
			projectId: 'mockProjectId',
			workspaceId: 'mockWorkspaceId',
			workspaceName: 'mockWorkspaceName',
		});

		getMeshId.mockResolvedValue('mockMeshId');
		deleteLogForwarding.mockResolvedValue();

		global.requestId = 'dummy_request_id';

		logSpy = jest.spyOn(DeleteLogForwardingCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(DeleteLogForwardingCommand.prototype, 'error');
		parseSpy = jest.spyOn(DeleteLogForwardingCommand.prototype, 'parse');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should fail if mesh ID is not found', async () => {
		getMeshId.mockResolvedValueOnce(null);

		await expect(DeleteLogForwardingCommand.run()).rejects.toThrow(
			'Unable to delete log forwarding details. No mesh found for Org(mockOrgCode) -> Project(mockProjectId) -> Workspace(mockWorkspaceId). Check the details and try again.',
		);

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorLogSpy).toHaveBeenCalledWith(
			'Unable to delete log forwarding details. No mesh found for Org(mockOrgCode) -> Project(mockProjectId) -> Workspace(mockWorkspaceId). Check the details and try again.',
		);
	});

	test('should skip confirmation if autoConfirmAction is set', async () => {
		parseSpy.mockResolvedValueOnce({
			flags: {
				ignoreCache: false,
				autoConfirmAction: true,
			},
		});

		await DeleteLogForwardingCommand.run();

		expect(promptConfirm).not.toHaveBeenCalled();
		expect(deleteLogForwarding).toHaveBeenCalledWith(
			'mockOrgCode',
			'mockProjectId',
			'mockWorkspaceId',
			'mockMeshId',
		);
		expect(logSpy).toHaveBeenCalledWith('Successfully deleted log forwarding details');
	});

	test('should fail if deleteLogForwarding throws an error', async () => {
		deleteLogForwarding.mockRejectedValueOnce(new Error('Deletion failed'));

		await expect(DeleteLogForwardingCommand.run()).rejects.toThrow(
			'failed to delete log forwarding details. Try again. RequestId: dummy_request_id',
		);

		expect(logSpy).not.toHaveBeenCalledWith('Successfully deleted log forwarding details');
		expect(errorLogSpy).toHaveBeenCalledWith(
			'failed to delete log forwarding details. Try again. RequestId: dummy_request_id',
		);
	});

	test('should delete log forwarding details successfully', async () => {
		await DeleteLogForwardingCommand.run();

		expect(deleteLogForwarding).toHaveBeenCalledWith(
			'mockOrgCode',
			'mockProjectId',
			'mockWorkspaceId',
			'mockMeshId',
		);
		expect(logSpy).toHaveBeenCalledWith('Successfully deleted log forwarding details');
	});
});
