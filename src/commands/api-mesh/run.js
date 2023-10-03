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
const {
	portNoFlag,
	debugFlag,
	envFileFlag,
	autoConfirmActionFlag,
	readFileContents,
	validateAndInterpolateMesh,
	checkPlaceholders,
	getFilesInMeshConfig,
} = require('../../utils');
const meshBuilder = require('@testmeshbuilder/mesh-builder');
const fs = require('fs');
const UUID = require('../../uuid');
const path = require('path');
const { initRequestId, startGraphqlServer, importFiles } = require('../../helpers');
const logger = require('../../classes/logger');
require('dotenv').config();

const { validateMesh, buildMesh, compileMesh } = meshBuilder.default;

class RunCommand extends Command {
	static summary = 'Run local development server';
	static description = 'Run a local development server that builds and compiles a mesh locally';

	static args = [
		{
			name: 'file',
			description: 'Mesh File',
		},
	];

	static flags = {
		port: portNoFlag,
		debug: debugFlag,
		env: envFileFlag,
		autoConfirmAction: autoConfirmActionFlag,
	};

	static enableJsonFlag = true;

	static examples = [];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(RunCommand);

		if (!args.file) {
			throw new Error('Missing file path. Run aio api-mesh run --help for more info.');
		}

		let portNo;

		//To set the port number using the environment file
		if (process.env.PORT !== undefined) {
			if (isNaN(process.env.PORT) || !Number.isInteger(parseInt(process.env.PORT))) {
				throw new Error('PORT value in the .env file is not a valid integer');
			}

			portNo = process.env.PORT;
		}

		//To set the port number as the provided value in the command
		if (flags.port !== undefined) {
			portNo = flags.port;
		}

		//To set the default port to 5000
		if (!portNo) {
			portNo = 5000;
		}

		const envFilePath = await flags.env;

		try {
			//Ensure that current directory includes package.json
			if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
				//Read the mesh input file
				let inputMeshData = await readFileContents(args.file, this, 'mesh');
				let data;

				if (checkPlaceholders(inputMeshData)) {
					this.log('The provided mesh contains placeholders. Starting mesh interpolation process.');
					data = await validateAndInterpolateMesh(inputMeshData, envFilePath, this);
				} else {
					try {
						data = JSON.parse(inputMeshData);
					} catch (err) {
						this.log(err.message);
						throw new Error('Input mesh file is not a valid JSON. Please check the file provided.');
					}
				}

				let filesList = [];

				try {
					filesList = getFilesInMeshConfig(data, args.file);
				} catch (err) {
					this.log(err.message);
					throw new Error('Input mesh config is not valid.');
				}

				// if local files are present, import them in files array in meshConfig
				if (filesList.length) {
					try {
						data = await importFiles(data, filesList, args.file, flags.autoConfirmAction);
					} catch (err) {
						this.log(err.message);
						throw new Error(
							'Unable to import the files in the mesh config. Please check the file and try again.',
						);
					}
				}

				//Generating unique mesh id
				let meshId = UUID.newUuid().toString();

				await validateMesh(data.meshConfig);
				await buildMesh(meshId, data.meshConfig);
				await compileMesh(meshId);

				//Set the value of API_MESH_TIER
				const isTI = process.env.API_MESH_TIER === 'TI';

				//Get the value of tenantUUID for TI
				const tenantUUID = process.env.tenantUUID;

				this.log(`Starting server on port : ${portNo}`);
				await startGraphqlServer(meshId, portNo, flags.debug, isTI, tenantUUID);
			} else {
				throw new Error(
					'`aio api-mesh run` cannot be executed because there is no package.json file in the current directory. Use `aio api-mesh init` to set up a package.',
				);
			}
		} catch (error) {
			this.error(error.message);
		}
	}
}

module.exports = RunCommand;
