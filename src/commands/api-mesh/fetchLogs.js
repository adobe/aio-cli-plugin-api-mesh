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
const { ignoreCacheFlag, jsonFlag } = require('../../utils');
const { getMeshId, getMesh, fetchLogs} = require('../../lib/devConsole');

require('dotenv').config();
class FetchLogsCommand extends Command {
	static args = [{ name: 'file' }];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		json: jsonFlag,
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		this.log("hello world")

		const { args, flags } = await this.parse(FetchLogsCommand);

		const ignoreCache = await flags.ignoreCache;
		const json = await flags.json;

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

				if (mesh) {
					this.log('Successfully retrieved mesh %s', data);


					console.log(mesh.data)
					// Check if 'data' is an array
					if (Array.isArray(mesh.data)) {
						const data = mesh.data;
					
						// Function to pad strings to a fixed length
						const padString = (str, length) => {
							return (str || '').padEnd(length);
						};
					
						// Function to format a log entry
						const formatLogEntry = (entry) => {
							return `${padString(entry.datetime, 15)} ${padString(entry.status.toString(), 9)} ${padString(entry.method, 9)} ${padString(entry.rayID, 38)}`;
						};
					
						// Print the header
						this.log(`${padString('Datetime', 15)} ${padString('Status', 9)} ${padString('Method', 9)} ${padString('RayID', 38)}`);
					
						// Print a separator line
						this.log(`${'-'.repeat(15)} ${'-'.repeat(9)} ${'-'.repeat(9)} ${'-'.repeat(20)}`);
					
						// Loop through the 'data' array and print each log entry
						data.forEach((entry) => {
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

FetchLogsCommand.description = 'Get the config of a given mesh';

module.exports = FetchLogsCommand;
