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
const path = require('path');
const fs = require('fs');
const { initSdk, promptConfirm, initRequestId } = require('../../../../../helpers');
const { getMeshId, getLogForwardingErrors } = require('../../../../../lib/smsClient');
const logger = require('../../../../../classes/logger');
const axios = require('axios');
const {
	ignoreCacheFlag,
	startTimeFlag,
	endTimeFlag,
	logFilenameFlag,
	pastFlag,
	suggestCorrectedDateFormat,
	parsePastDuration,
	validateDateTimeRange,
	validateDateTimeFormat,
} = require('../../../../../utils');

require('dotenv').config();

class GetLogForwardingErrorsCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		startTime: startTimeFlag,
		endTime: endTimeFlag,
		filename: logFilenameFlag,
		past: pastFlag,
	};

	async run() {
		await initRequestId();
		logger.info(`RequestId: ${global.requestId}`);
		const { flags } = await this.parse(GetLogForwardingErrorsCommand);
		const ignoreCache = await flags.ignoreCache;
		const filename = await flags.filename;
		let calculatedStartTime, calculatedEndTime, formattedStartTime, formattedEndTime;

		if (!filename || path.extname(filename).toLowerCase() !== '.csv') {
			this.error('Invalid file type. Provide a filename with a .csv extension.');
			return;
		}

		if (flags.startTime && flags.endTime) {
			const dateTimeRegex = /^(?:(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(0[0-9]|1[0-9]|2[0-3]):([0-5]\d):([0-5]\d)Z)$/;
			if (!dateTimeRegex.test(flags.startTime)) {
				const correctedStartTime = suggestCorrectedDateFormat(flags.startTime);
				if (!correctedStartTime) {
					this.error('Invalid date components in the startTime. Correct the date and try again.');
				} else {
					this.error(
						`Use the format YYYY-MM-DDTHH:MM:SSZ for startTime. Did you mean ${correctedStartTime}?`,
					);
				}
				return;
			}
			if (!dateTimeRegex.test(flags.endTime)) {
				const correctedEndTime = suggestCorrectedDateFormat(flags.endTime);
				if (!correctedEndTime) {
					this.error('Invalid date components in the endTime. Correct the date and try again.');
				} else {
					this.error(
						`Use the format YYYY-MM-DDTHH:MM:SSZ for endTime. Did you mean ${correctedEndTime}?`,
					);
				}
				return;
			}
			validateDateTimeRange(flags.startTime, flags.endTime);
			formattedStartTime = flags.startTime.replace(/-|:|Z/g, '').replace('T', 'T');
			formattedEndTime = flags.endTime.replace(/-|:|Z/g, '').replace('T', 'T');
		} else if (flags.past) {
			const pastTimeWindow = parsePastDuration(flags.past);
			calculatedEndTime = new Date();
			calculatedStartTime = new Date(calculatedEndTime.getTime() - pastTimeWindow);
			validateDateTimeRange(calculatedStartTime, calculatedEndTime);
			formattedStartTime = validateDateTimeFormat(calculatedStartTime);
			formattedEndTime = validateDateTimeFormat(calculatedEndTime);
		} else if ((flags.startTime && !flags.endTime) || (!flags.startTime && flags.endTime)) {
			this.error('You must provide both a startTime and an endTime.');
			return;
		} else {
			this.error(
				'Missing required flags. Provide a time range with --startTime and  --endTime flags,  or use the --past flag for recent errors. Use the `mesh config get log-forwarding errors --help` command for more information.',
			);
			return;
		}

		if (!filename) {
			this.error('Missing filename. Provide a valid file in the current working directory.');
			return;
		}

		const outputFile = path.resolve(process.cwd(), filename);
		if (!fs.existsSync(outputFile)) {
			fs.writeFileSync(outputFile, '');
		}
		const stats = fs.statSync(outputFile);
		if (stats.size > 0) {
			throw new Error(`Make sure the file: ${filename} is empty`);
		}

		logger.info('Calling initSdk...');
		const { imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({ ignoreCache });
		let meshId = null;
		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.error(`Unable to get mesh ID: ${err.message}.`);
		}
		if (!meshId) {
			this.error('Mesh ID not found.');
		}

		const { errorUrls, totalSize } = await getLogForwardingErrors(
			imsOrgCode,
			projectId,
			workspaceId,
			meshId,
			formattedStartTime,
			formattedEndTime,
		);
		if (!errorUrls || errorUrls.length === 0) {
			this.error('No log forwarding errors found for the specified time range.');
		}

		let shouldDownload = false;
		if (totalSize > 0) {
			const totalSizeKB = (totalSize / 1024).toFixed(2);
			shouldDownload = await promptConfirm(
				`The expected file size is ${totalSizeKB} KB. Do you want to download ${filename}? (y/n)`,
			);
			if (shouldDownload) {
				const writer = fs.createWriteStream(outputFile, { flags: 'a' });
				const columnHeaders =
					'EventTimestampMs,ErrorType,ErrorMessage,MeshId,RayID,URL,Request Method,Response Status,Level';
				writer.write(`${columnHeaders}\n`);
				for (const urlObj of errorUrls) {
					const { key, url } = urlObj;
					logger.info(`Downloading ${key} and appending to ${outputFile}...`);
					try {
						const fileContentStream = await this.downloadFileContent(url);
						fileContentStream.pipe(writer, { end: false });
						await new Promise((resolve, reject) => {
							fileContentStream.on('end', resolve);
							fileContentStream.on('error', reject);
						});
						logger.info(`${key} content appended successfully.`);
					} catch (error) {
						logger.error(`Error downloading or appending content of ${key}:`, error);
					}
				}
				writer.end();
				this.log(`Successfully downloaded the log forwarding errors to ${filename}.`);
			} else {
				this.log('Log forwarding error files not downloaded.');
			}
		} else {
			this.error('No log forwarding errors available to download');
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
				logger.error('Error downloading log forwarding error content:', error.message);
				throw error;
			});
	}
}

GetLogForwardingErrorsCommand.description =
	'Download log forwarding errors for a specified time period.';

module.exports = GetLogForwardingErrorsCommand;
