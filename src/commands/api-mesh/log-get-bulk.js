const { Command } = require('@oclif/core');
const path = require('path');
const fs = require('fs');
const { initRequestId, initSdk, promptConfirm } = require('../../helpers');
const { getMeshId, getPresignedUrls } = require('../../lib/devConsole');
const logger = require('../../classes/logger');
const axios = require('axios');
const {
	ignoreCacheFlag,
	startTimeFlag,
	endTimeFlag,
	logFilenameFlag,
	pastFlag,
	fromFlag,
	suggestCorrectedDateFormat,
	parsePastDuration,
	validateDateTimeRange,
	validateDateTimeFormat,
	localToUTCTime,
} = require('../../utils');

require('dotenv').config();

class GetBulkLogCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
		startTime: startTimeFlag,
		endTime: endTimeFlag,
		filename: logFilenameFlag,
		past: pastFlag,
		from: fromFlag,
	};

	async run() {
		// Column headers to be written as the first row in the output file
		const columnHeaders =
			'EventTimestampMs,Exceptions,Logs,Outcome,MeshId,RayID,URL,Request Method,Response Status,Level';

		await initRequestId();
		logger.info(`RequestId: ${global.requestId}`);
		const { flags } = await this.parse(GetBulkLogCommand);
		const ignoreCache = await flags.ignoreCache;

		const filename = await flags.filename;

		let calculatedStartTime, calculatedEndTime, formattedStartTime, formattedEndTime;

		// Only supports files that end with .csv
		if (!filename || path.extname(filename).toLowerCase() !== '.csv') {
			this.error('Invalid file type. Provide a filename with a .csv extension.');
			return;
		}

		if (flags.startTime && flags.endTime) {
			// Regular expression to validate the input date format YYYY-MM-DDTHH:MM:SSZ
			const dateTimeRegex = /^(?:(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(0[0-9]|1[0-9]|2[0-3]):([0-5]\d):([0-5]\d)Z)$/;

			// Validate user provided startTime format
			if (!dateTimeRegex.test(flags.startTime)) {
				const correctedStartTime = suggestCorrectedDateFormat(flags.startTime);
				if (!correctedStartTime) {
					this.error('Invalid date components in startTime. Correct the date.');
				} else {
					this.error(
						`Use the format YYYY-MM-DDTHH:MM:SSZ for startTime. Did you mean ${correctedStartTime}?`,
					);
				}
				return;
			}

			// Validate user provided endTime format
			if (!dateTimeRegex.test(flags.endTime)) {
				const correctedEndTime = suggestCorrectedDateFormat(flags.endTime);
				// Check for incorrect date components
				if (!correctedEndTime) {
					this.error('Found invalid date components for endTime. Check and correct the date.');
				} else {
					this.error(
						`Use the format YYYY-MM-DDTHH:MM:SSZ for endTime. Did you mean ${correctedEndTime}?`,
					);
				}
				return;
			}

			// Validate the date-time range
			validateDateTimeRange(flags.startTime, flags.endTime);

			// Properly format startTime and endTime strings before handing it over to SMS
			formattedStartTime = flags.startTime.replace(/-|:|Z/g, '').replace('T', 'T');
			formattedEndTime = flags.endTime.replace(/-|:|Z/g, '').replace('T', 'T');
		} else if (flags.past) {
			const pastTimeWindow = parsePastDuration(flags.past);
			if (flags.from) {
				let convertedTime;
				const dateTimeRegex = /^\d{4}-\d{2}-\d{2}:\d{2}:\d{2}:\d{2}$/;
				if (!dateTimeRegex.test(flags.from)) {
					this.error('Invalid format. Use the format YYYY-MM-DD:HH:MM:SS for --from.');
				} else {
					try {
						convertedTime = await localToUTCTime(flags.from.toString());
					} catch (error) {
						this.error(`Invalid date components passed in --from. Correct the date.`);
					}
				}
				// add the past window to the converted time to get the end time to fetch logs from the past
				calculatedStartTime = new Date(convertedTime);
				calculatedEndTime = new Date(calculatedStartTime.getTime() + pastTimeWindow);
			} else {
				// subtract the past window from the current time to get the start time to fetch recent logs from now
				calculatedEndTime = new Date();
				calculatedStartTime = new Date(calculatedEndTime.getTime() - pastTimeWindow);
			}

			// Validate the calculated start and end times range
			validateDateTimeRange(calculatedStartTime, calculatedEndTime);
			// Properly format startTime and endTime strings before handing it over to SMS i.e remove the milliseconds
			formattedStartTime = validateDateTimeFormat(calculatedStartTime);
			formattedEndTime = validateDateTimeFormat(calculatedEndTime);
		} else if ((flags.startTime && !flags.endTime) || (!flags.startTime && flags.endTime)) {
			this.error('Provide both startTime and endTime.');
			return;
		} else {
			this.error(
				'Missing required flags. Provide at least one flag --startTime, --endTime, or --past --from or  type `mesh log:get-bulk --help` for more information.',
			);
			return;
		}

		// Validate required filename flag
		if (!filename) {
			this.error('Missing filename. Provide a valid file in the current working directory.');
			return;
		}

		// Check if the file exists
		const outputFile = path.resolve(process.cwd(), filename);

		// Check if file exists and if doesn't, create one in the cwd and continue
		if (!fs.existsSync(outputFile)) {
			fs.writeFileSync(outputFile, '');
		}

		//check if the file is empty before proceeding
		const stats = fs.statSync(outputFile);
		if (stats.size > 0) {
			throw new Error(`Make sure the file: ${filename} is empty`);
		}

		logger.info('Calling initSdk...');
		const { imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		// Retrieve meshId
		let meshId = null;
		try {
			meshId = await getMeshId(imsOrgCode, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.error(`Unable to get mesh ID: ${err.message}.`);
		}

		if (!meshId) {
			this.error('Mesh ID not found.');
		}

		// 5. Call downloadFiles
		const { presignedUrls, totalSize } = await getPresignedUrls(
			imsOrgCode,
			projectId,
			workspaceId,
			meshId,
			formattedStartTime,
			formattedEndTime,
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
				`The expected file size is ${totalSizeKB} KB. Confirm ${filename} download? (y/n)`,
			);
			if (shouldDownload) {
				//create a writer and proceed with download
				const writer = fs.createWriteStream(outputFile, { flags: 'a' });

				// Write the column headers before appending the log content
				writer.write(`${columnHeaders}\n`);

				// Stream the data from the signed URLs
				for (const urlObj of presignedUrls) {
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
				// Ensure the stream is closed
				writer.end();

				this.log(`Successfully downloaded the logs to ${filename}.`);
			} else {
				this.log('Log files not downloaded.');
			}
		} else {
			this.error('No logs available to download');
		}
	}
	/**
	 * Downloads the content of a file from the provided presigned URL.
	 *
	 * @param {string} url  - presigned URL to download the log from
	 * @returns {Promise<Stream.Readable>} - A promise that resolves to a readable stream of the file content
	 */

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

GetBulkLogCommand.description = 'Download all mesh logs for a selected time period.';

module.exports = GetBulkLogCommand;
