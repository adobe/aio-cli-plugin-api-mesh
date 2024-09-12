const { Command } = require('@oclif/core');

const logger = require('../../classes/logger');
const { initSdk, initRequestId } = require('../../helpers');
const { ignoreCacheFlag, jsonFlag, fileNameFlag } = require('../../utils');
const { getMeshId, listLogs } = require('../../lib/devConsole');
const { appendFileSync, existsSync } = require('fs');
const { ux } = require('@oclif/core/lib/cli-ux');
const path = require('path');

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

		const { flags } = await this.parse(ListLogsCommand);

		const ignoreCache = await flags.ignoreCache;
		const json = await flags.json;
		const fileName = await flags.filename;

		if (fileName) {
			if (path.extname(fileName).toLowerCase() !== '.csv') {
				this.error('Invalid file type. Provide a filename with a .csv extension.');
			}
			const file = path.resolve(process.cwd(), fileName);
			if (existsSync(file)) {
				this.error(`File ${fileName} already exists. Please provide a new file name.`);
			}
		}

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
				const logs = await listLogs(imsOrgId, projectId, workspaceId, meshId, fileName);

				if (logs && logs.length > 0) {
					// add a new line
					this.log();
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
								? line => appendFileSync(fileName, line + '\n')
								: line => this.log(line),
							csv: fileName,
							...flags,
						},
					);
				} else {
					this.log(
						'No recent logs found. Alternatively, you can use the following command to get all logs for a 30 minute time period: \naio api-mesh log-get-bulk --startTime YYYY-MM-DDTHH:MM:SSZ --endTime YYYY-MM-DDTHH:MM:SSZ --filename mesh_logs.csv',
					);
				}
			} catch (error) {
				this.error(`Failed to fetch logs, RequestId: ${global.requestId}`);
			}
		} else {
			this.error(
				`Unable to get mesh config. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}
	}
}

ListLogsCommand.description = 'Get recent logs of requests made to the API Mesh.';

module.exports = ListLogsCommand;
