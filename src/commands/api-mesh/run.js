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
const { portNoFlag, debugFlag } =require('../../utils')

const { promptConfirm, promptSelect, runCliCommand } = require('../../helpers');

class RunCommand extends Command {
	static summary = 'Run local development server';
	static description =
		'This command will run a local development server for developers to build, compile and debug meshes';

	static args = [
		{
			name: 'meshFile',
			required: true,
			description: 'Mesh JSON',
		},
	];

	static flags = {
        port: portNoFlag,
        debug: debugFlag
	};

	static enableJsonFlag = true;

	static examples = [];

	async run() {
		const { args, flags } = await this.parse(InitCommand);
        if(flags.debug){
            console.log("Run in debug mode");
        }
	}
}

module.exports = InitCommand;
