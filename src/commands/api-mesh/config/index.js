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

class ConfigCommand extends Command {
	static summary = 'Manage the configuration for API Mesh';

	static usage = 'api-mesh:config [COMMAND]';

	async run() {
		const help = new Help(this.config);
		await help.showHelp(['api-mesh:config', '--help']);
	}
}

ConfigCommand.description = `The 'config' command includes the following options:
- set: Set log forwarding details for a given mesh.
- get: Retrieve log forwarding details for a given mesh.
- delete: Delete log forwarding details for a given mesh.`;

module.exports = ConfigCommand;
