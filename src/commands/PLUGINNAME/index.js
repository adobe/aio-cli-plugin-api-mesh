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

const { Command, flags } = require('@oclif/command');
const aioLogger = require('@adobe/aio-lib-core-logging')('PLUGINNAME', { provider: 'debug' });

class IndexCommand extends Command {
	async run() {
		// const { args, flags } = this.parse(IndexCommand)
		aioLogger.debug('this is the index command.');
	}
}

IndexCommand.flags = {
	someflag: flags.string({ char: 'f', description: 'this is some flag' }),
};

// this is set in package.json, see https://github.com/oclif/oclif/issues/120
// if not set it will get the first (alphabetical) topic's help description
IndexCommand.description = 'Your description here';
IndexCommand.examples = ['$ aio PLUGINNAME:some_command'];

module.exports = IndexCommand;
