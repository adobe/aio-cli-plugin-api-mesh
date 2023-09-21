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
const { portNoFlag, debugFlag, readFileContents } = require('../../utils')
const meshBuilder = require('@adobe/mesh-builder');
const fs = require('fs');
const UUID = require('../../uuid');
const path = require('path');
const dotenv = require('dotenv');
const { exec } = require('child_process');

const { buildMesh, compileMesh } = meshBuilder.default;

function startGraphqlServer(meshId, port, debug = false) {
	const serverPath = `${__dirname}/../../server.js ${meshId} ${port}`;
	const command = debug
		? `node --inspect-brk --trace-warnings ${serverPath}`
		: `node ${serverPath}`;

	const server = exec(command);

	server.stdout.on('data', data => {
		console.log('Data from server - ', data);
	});

	server.stderr.on('data', data => {
		console.log('Error from server - ', data);
	});

	server.on('close', code => {
		console.log(`Server closed with code ${code}`);
	});

	server.on('exit', code => {
		console.log(`Server exited with code ${code}`);
	});

	server.on('error', err => {
		console.log(`Server exited with error ${err}`);
	});
}

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

		//To set the port number as default or provided value in the command
		portNo = await flags.port;

		//Set the debugStatus based on flags
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


		try {
			//Ensure that current directory includes package.json
			if (fs.existsSync(path.join(process.cwd(), "package.json"))) {
				//Read the mesh input file
				let inputMeshData = await readFileContents(args.file, this, 'mesh');
				let data = JSON.parse(inputMeshData);

				//Generating unique mesh id
				let meshId = UUID.newUuid().toString();

				const config = {
					sources: [
						{
							name: 'MagentoMonolithApi',
							handler: {
								graphql: {
									endpoint: 'https://venia.magento.com/graphql',
								},
							},
						},
					],
				};

				return buildMesh(meshId, config)
				.then(() => compileMesh(meshId))
				.then(() => startGraphqlServer(meshId, portNo, debugStatus))
			}
			else {
				this.error("aio api-mesh run command cannot be executed as there is no package.json file in current directory. Use aio api-mesh init command to setup a package.")
			}
		}
		catch (error) {
			this.log("ERROR: " + error.message);
		}

	}
}

module.exports = RunCommand;