/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { Help, Command } = require('@oclif/core');

/**
 * API Mesh command. Defers to topic for help text.
 */
class ApiMeshCommand extends Command {
	async run() {
		const help = new Help(this.config);
		await help.showHelp(['api-mesh', '--help']);
	}
}

ApiMeshCommand.description = 'Create, run, test, and deploy API Mesh';
ApiMeshCommand.args = [];

module.exports = ApiMeshCommand;
