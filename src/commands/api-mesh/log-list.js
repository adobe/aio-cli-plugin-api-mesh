const { Command } = require('@oclif/core');

const logger = require('../../classes/logger');
const { initSdk, initRequestId } = require('../../helpers');
const { ignoreCacheFlag, jsonFlag, fileNameFlag } = require('../../utils');
const { getMeshId, listLogs } = require('../../lib/devConsole');
const { appendFileSync } = require('fs');
const { ux } = require('@oclif/core/lib/cli-ux');

require('dotenv').config();
class ListLogsCommand extends Command {
	//static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		json: jsonFlag,
		filename: fileNameFlag,
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(ListLogsCommand);

		const ignoreCache = await flags.ignoreCache;
		const json = await flags.json;
		const fileName = await flags.filename;

		const { imsOrgId, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
			verbose: !json,
		});

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}
		if (meshId) {
			try {
				const logs = await listLogs(imsOrgId, projectId, workspaceId, workspaceName, meshId, fileName);
				// add a new line
				this.log();
				
				if (logs && logs.length > 0) {
					ux.table(
						logs,
						{
							rayId: {
								header: 'Ray ID',
								minWidth: 15,
							},
							timestamp: {
								header: 'Timestamp',
								minWidth: 15,
							},
							responseStatus: {
								header: 'Response Status',
								minWidth: 15,
							},
							level: {
								header: 'Level',
								minWidth: 15,
							},
						},
						{
							printLine: fileName
								? line => appendFileSync(fileName || 'logs.csv', line + '\n')
								: line => this.log(line),
							csv: fileName,
							...flags,
						},
					);
				} else {
					this.log('No logs found');
				}
			} catch (error) {
				this.log(error.message);
				this.error(`Failed to fetch logs, RequestId: ${global.requestId}`);
			}
		} else {
			this.error(
				`Unable to get mesh config. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again.`,
				{ exit: false },
			);
		}
	}
}

ListLogsCommand.description = 'Get the rayIds of a given mesh';

module.exports = ListLogsCommand;
