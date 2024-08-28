const { Command } = require('@oclif/core');
const path = require('path');
const fs = require('fs');
const { initRequestId, initSdk, promptConfirm } = require('../../helpers');
const { getMeshId, downloadFilesSequentially } = require('../../lib/devConsole');
const logger = require('../../classes/logger');
const axios = require('axios');
const { ignoreCacheFlag, startTimeFlag, endTimeFlag, logFilenameFlag } = require('../../utils');

require('dotenv').config();

class GetBulkLogCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		startTime: startTimeFlag,
		endTime: endTimeFlag,
		filename: logFilenameFlag,
	};

	async run() {
		// Column headers to be written as the first row in the output file
		const columnHeaders =
			'EventTimestampMs,Exceptions,Logs,Outcome,MeshId,RayID,URL,Request Method,Response Status,Level';
		await initRequestId();
		logger.info(`RequestId: ${global.requestId}`);
		const { flags } = await this.parse(GetBulkLogCommand);
		const ignoreCache = await flags.ignoreCache;
		const startTime = await flags.startTime.replace(/-|:|Z/g, '').replace('T', 'T');
		const endTime = await flags.endTime.replace(/-|:|Z/g, '').replace('T', 'T');
		const filename = await flags.filename;
		const { imsOrgId, imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		// 1. Require both startTime and endTime
		if (!startTime || !endTime) {
			this.error('Provide both startTime and endTime');
			return;
		}

		// 2. Validate filepath
		if (!filename) {
			this.error(
				'Missing file path. Please provide a valid file in the current working directory.',
			);
			return;
		}

		// 3. Validate startTime < endTime
		if (startTime > endTime) {
			this.error('endTime should be greater than startTime');
		}

		// 4. Retrieve meshId
		let meshId = null;
		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.error(`Unable to get mesh ID: ${err.message}`);
		}

		if (!meshId) {
			this.error('Mesh ID not found.');
		}

		// 5. Call downloadFiles
		const { presignedUrls, totalSize } = await downloadFilesSequentially(
			imsOrgCode,
			projectId,
			workspaceId,
			meshId,
			startTime,
			endTime,
		);
		//If presigned URLs are not found, throw error saying that no logs are found
		if (!presignedUrls || presignedUrls.length === 0) {
			this.error('No logs found for the given time range.');
		}

		let shouldDownload = false;
		if (totalSize > 0) {
			const totalSizeKB = (totalSize / 1024).toFixed(2); // Convert bytes to KB
			// 7. Get user confirmation
			shouldDownload = await promptConfirm(
				`Expected file size is ${totalSizeKB} KB. Please confirm to output to file ${filename} (y/n)`,
			);
			if (shouldDownload) {
				// 7. Check if the file exists
				const outputFile = path.resolve(process.cwd(), filename);
				const writer = fs.createWriteStream(outputFile, { flags: 'a' });
				if (fs.existsSync(outputFile)) {
					const stats = fs.statSync(outputFile);
					if (stats.size > 0) {
						throw new Error('File is not empty. Overwrite not allowed.');
					}
				} else {
					throw new Error(`Specified file doesn't exist in the ${process.cwd()}`);
				}

				// Write the column headers before appending the log content
				writer.write(`${columnHeaders}\n`);

				// 8. Stream the data from the signed URLs consecutively
				for (const urlObj of presignedUrls) {
					//await this.downloadAndAppend(url, outputFile);
					const { key, url } = urlObj;
					logger.info(`Downloading ${key} and appending to ${outputFile}...`);

					try {
						const fileContentStream = await this.downloadFileContent(url);
						fileContentStream.pipe(writer, { end: false });

						await new Promise((resolve, reject) => {
							fileContentStream.on('end', resolve);
							fileContentStream.on('error', reject);
						});
						// We can write a newline after each file write
						writer.write('\n');

						logger.info(`${key} content appended successfully.`);
					} catch (error) {
						logger.error(`Error downloading or appending content of ${key}:`, error);
					}
				}

				this.log(`Successfully downloaded the logs to ${filename}`);
			} else {
				this.log('Log files are not downloaded.');
			}
		} else {
			this.error('No logs to download');
		}
	}

	async downloadFileContent(url) {
		return axios({
			method: 'get',
			url: url,
			responseType: 'stream',
		})
			.then(response => response.data)
			.catch(error => {
				logger.error('Error downloading log content:', error.message);
				throw error;
			});
	}
}

GetBulkLogCommand.description = 'Download logs in bulk';

module.exports = GetBulkLogCommand;
