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

const { Command } = require('@oclif/core');
const { initSdk, promptConfirm } = require('../../../../../helpers');
const { getMeshId, getLogForwardingErrors } = require('../../../../../lib/smsClient');
const logger = require('../../../../../classes/logger');
const axios = require('axios');
const { ignoreCacheFlag, fileNameFlag } = require('../../../../../utils');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

class GetLogForwardingErrorsCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		filename: fileNameFlag,
	};

	static usage = 'api-mesh:config:get:log-forwarding:errors';

	async run() {
		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(GetLogForwardingErrorsCommand);

		const { ignoreCache, filename } = await flags;

		logger.info('Calling initSdk...');

		const { imsOrgCode, projectId, workspaceId } = await initSdk({ ignoreCache });

		// Retrieve meshId
		let meshId = '';

		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, meshId);
			if (!meshId) {
				throw new Error('MeshIdNotFound');
			}
		} catch (err) {
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		// fetch log forwarding errors presigned URLs
		const { presignedUrls, totalSize } = await getLogForwardingErrors(
			imsOrgCode,
			projectId,
			workspaceId,
			meshId,
		);

		// If presigned URLs are not found, throw error saying that no log forwarding errors are found
		if (!presignedUrls || presignedUrls.length === 0) {
			this.error(
				`No log forwarding errors found for the configured destination. RequestId: ${global.requestId}`,
			);
		}

		const allRows = [];
		let shouldDownload = true;

		// If filename is provided, check if it has a .csv extension and if the file exists
		if (filename) {
			if (path.extname(filename).toLowerCase() !== '.csv') {
				this.error('Invalid file type. Provide a filename with a .csv extension.');
			}
			const outputFile = path.resolve(process.cwd(), filename);
			if (fs.existsSync(outputFile)) {
				// If the file exists, check if it is empty
				const stats = fs.statSync(outputFile);
				if (stats.size > 0) {
					this.error(`Make sure the file: ${filename} is empty`);
				}
			} else {
				// If the file does not exist, create an empty file
				fs.writeFileSync(outputFile, '');
			}
		}
		if (totalSize > 0) {
			// Download and process each presigned URL
			for (const { url } of presignedUrls) {
				try {
					logger.info(`[GetLogForwardingErrorsCommand] Downloading from URL: ${url}`);
					const stream = await this.downloadFileContent(url);
					const content = await this.streamToString(stream);
					// Split content into lines, filter out empty lines
					const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
					allRows.push(...lines);
				} catch (err) {
					this.log(
						`Failed to download or process log file: ${err.message}. RequestId: ${global.requestId}`,
					);
				}
			}
			// if filename is provided, write the content to the file
			if (filename) {
				const totalSizeKB = (totalSize / 1024).toFixed(2);
				// Get user confirmation before downloading
				shouldDownload = await promptConfirm(
					`The expected file size is ${totalSizeKB} KB. Confirm ${filename} download? (y/n)`,
				);
				if (shouldDownload) {
					const outputFile = path.resolve(process.cwd(), filename);
					const csvContent = allRows.join('\n');
					fs.writeFileSync(outputFile, csvContent + '\n', 'utf8');
					this.log(`Successfully downloaded the log forwarding error logs to ${filename}`);
				} else {
					this.log('Log forwarding errors file not downloaded.');
					return;
				}
			}
			// If filename is not provided, print the logs to the console
			else {
				this.log(`\nSuccessfully fetched log forwarding errors.`);
				// print the error logs each in a new line starting with >
				allRows.forEach(rows => {
					this.log(`> ${rows}`);
				});
			}
		} else {
			this.error(
				`No log forwarding error logs available for the configured destination. RequestId: ${global.requestId}`,
			);
		}
	}

	// Download file content from the presigned URL
	async downloadFileContent(url) {
		logger.debug(`[downloadFileContent] Downloading from URL: ${url}`);
		return axios({
			method: 'get',
			url: url,
			responseType: 'stream',
		})
			.then(response => response.data)
			.catch(error => {
				logger.error('Error downloading log forwarding error content:', error.message);
				throw error;
			});
	}

	// Parse CSV rows from the content
	async streamToString(stream) {
		const chunks = [];
		for await (const chunk of stream) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks).toString('utf8');
	}
}

GetLogForwardingErrorsCommand.description = 'Get log forwarding errors for the mesh.';

module.exports = GetLogForwardingErrorsCommand;
