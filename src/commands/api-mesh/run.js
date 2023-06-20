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
const { exec } = require('child_process');

const logger = require('../../classes/logger');
const { initRequestId } = require('../../helpers');
const { debugFlag } = require('../../utils');

require('dotenv').config();

function startGraphqlServer(debug = false) {
	const serverPath = `${__dirname}/../../server.js`;
	const command = debug ? `node --inspect-brk ${serverPath}` : `node ${serverPath}`;

	const server = exec(command);

	server.stdout.on('data', data => {
		console.log('Data from server - ', data);
	});

	server.stderr.on('data', data => {
		console.log('Error from server - ', data);
	});

	server.on('close', code => {
		console.log(`Server exited with code ${code}`);
	});

	server.on('exit', code => {
		console.log(`Server exited with code ${code}`);
	});

	server.on('error', err => {
		console.log(`Server exited with error ${err}`);
	});
}

class RunCommand extends Command {
	static flags = {
		debug: debugFlag,
	};

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(RunCommand);
		const debug = await flags.debug;

		startGraphqlServer(debug);
	}
}

RunCommand.description = 'Run mesh config';

module.exports = RunCommand;
