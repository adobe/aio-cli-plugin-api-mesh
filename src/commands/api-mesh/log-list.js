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
const { writeFile } = require('fs/promises');

const logger = require('../../classes/logger');
const { initSdk, initRequestId } = require('../../helpers');
const { ignoreCacheFlag, jsonFlag, fileNameFlag} = require('../../utils');
const { getMeshId, getMesh, fetchLogs} = require('../../lib/devConsole');

require('dotenv').config();
class FetchLogsCommand extends Command {
	//static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		json: jsonFlag,
		fileName: fileNameFlag
		
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(FetchLogsCommand);

		const ignoreCache = await flags.ignoreCache;
		const json = await flags.json;
		//const startTime = await flags.startTime;
		//const endTime = await flags.endTime;
		const fileName = await flags.fileName;

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
				const mesh = await fetchLogs(imsOrgId, projectId, workspaceId, workspaceName, meshId);
				const meshString = JSON.stringify(mesh, null, 2);
				const meshObject = JSON.parse(meshString)
				const data = JSON.stringify(meshObject.data);

				//console.log(mesh)

				//console.log('Start Time:', startTime, new Date(startTime).getTime());
        		//console.log('End Time:', endTime, new Date(endTime).getTime());
				//let startTimeMs = new Date(startTime).getTime();
				//let endTimeMs = new Date(endTime).getTime();

				if (mesh) {
					this.log('Successfully retrieved mesh %s');


					//console.log(mesh.data)
					if (Array.isArray(mesh.data)) {
						const data = mesh.data;
						//write to file if greater than 15 and gile arg is provided
						//const data = mesh.data.slice(0, 15);

						//data.prototype.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

						let filteredData = []

						/**
						 * if (startTime && endTime) {
							filteredData = data.filter(entry => {
								const entryTime = entry.datetime;
								//this.log('Entry Time:', entryTime, new Date(entryTime).getTime());
								//filteredData.append(entry)
								//console.log(startTimeMs, entryTime, endTimMs)
								//console.log(entryTime >= startTime)
								return entryTime >= startTimeMs && entryTime <= endTimeMs;
							});
						}
						 */
						
						filteredData = data.slice(0,15).filter(entry => {
							return entry;
						});
						//console.log(filteredData)

						if (fileName) {
							try {
								await writeFile(fileName, data.map(entry => Object.values(entry).join(',')).join('\n'));
								this.log(`Logs written to file: ${fileName}`);
							} catch (error) {
								this.error(`Unable to write logs to file: ${fileName}`);
							}
						}

						

					
						

						

						const padString = (str, length) => {
							return (str === null || str === undefined ? ''.padEnd(length) : String(str).padEnd(length));
						};

						// Function to format a log entry
						const formatLogEntry = (entry) => {
							return `${padString(entry.rayID, 38)} ${padString(entry.datetime, 15)} ${padString(entry.status, 10)} ${padString(entry.log, 9)}`;
						};

						// Print the header
						this.log(`${padString('RayID', 38)} ${padString('Datetime', 15)} ${padString('Status', 10)} ${padString('Log', 9)}`);

						// Print a separator line
						this.log(`${'-'.repeat(38)} ${'-'.repeat(15)} ${'-'.repeat(10)} ${'-'.repeat(9)}`);

						//console.log(filteredData)
						// Loop through the 'filteredData' array and print each log entry
						filteredData.forEach((entry) => {
							this.log(formatLogEntry(entry));
						});
						  

				} else {
					console.log('The "data" field is not an array.');
				}
				} else {
					console.log(`Unable to get mesh with the ID ${meshId}. Please check the mesh ID and try again. RequestId: ${global.requestId}`);
				}

				

			} catch (error) {
				this.log(error.message);

				this.error(
					`Unable to get mesh. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.error(
				`Unable to get mesh config. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again.`,
				{ exit: false },
			);
		}
	}
}

FetchLogsCommand.description = 'Get the rayIds of a given mesh';

module.exports = FetchLogsCommand;
