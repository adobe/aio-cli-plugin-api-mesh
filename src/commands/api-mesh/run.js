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

const { Command, Flags } = require('@oclif/core');
const { portNoFlag, debugFlag, readFileContents } = require('../../utils')
const meshBuilder = require('@adobe/mesh-builder');
const fs = require('fs');
const UUID = require('../../uuid');
const path = require('path');

const { buildMesh, compileMesh } = meshBuilder.default;

class RunCommand extends Command {
	static summary = 'Run local development server';
	static description =
		'This command will run a local development server for developers to build, compile and debug meshes';

	static args = [
		{
			name: 'file',
			required: true,
			description: 'Mesh File',
		},
	];

	static flags = {
		port: portNoFlag,
		debug: debugFlag
	};

	static enableJsonFlag = true;

	static examples = [];

	async run() {
		const { args, flags } = await this.parse(RunCommand);

		if (!args.file) {
			this.error('Missing file path. Run aio api-mesh run --help for more info.');
		}
		let portNo;
		let API_MESH_TIER;
		portNo = await flags.port;
		const debugStatus = await flags.debug;

		// Set the path to the .env file in the user's current working directory
		const localEnvFilePath = path.join(process.cwd(), '.env');


		//The environment variables are optional and need default values
		// Check if the .env file exists
		if (fs.existsSync(localEnvFilePath)) {
			// Load environment variables
			dotenv.config({ path: localEnvFilePath });

			if (process.env.hasOwnProperty('PORT')) {

				// Use parseInt to attempt to convert the environment variable's value to an integer
				const portNumber = parseInt(process.env.PORT);

				if (isNaN(portNumber) || !Number.isInteger(portNo)) {
					this.error('PORT value in the .env file is not a valid integer')
				}

				portNo = portNumber;

			}
			if (process.env.hasOwnProperty('API_MESH_TIER')) {
				API_MESH_TIER = process.env.API_MESH_TIER
			}

		}


		console.log(JSON.stringify(process.env));

		if (flags.debug) {
			console.log("Run in debug mode");
		}


		try {

			//Read the mesh input file
			let inputMeshData = await readFileContents(args.file, this, 'mesh');
			let data = JSON.parse(inputMeshData);

			//Generating unique mesh id
			let meshId = UUID.newUuid().toString();

			console.log(" PORT NO is : ", portNo);
			console.log("Mesh Id is ", meshId);

			return buildMesh(meshId, data.meshConfig);
			//await compileMesh(meshId);
		}
		catch (error) {
			console.log(error);
		}

	}
}

module.exports = RunCommand;