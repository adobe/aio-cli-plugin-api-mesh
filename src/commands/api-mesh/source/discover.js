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

const { Command, CliUx } = require('@oclif/core');
const { promptConfirm } = require('../../../helpers');
const GetCommand = require('./get')
const inquirer = require('inquirer');
const SourceRegistryStorage = require("connector-registry-storage-adapter");
const config = require('@adobe/aio-lib-core-config');

class DiscoverCommand extends Command {
    async run() {
        const srs = new SourceRegistryStorage(config.get('api-mesh.source-registry.path'));
        const list = await srs.getList()
        this.generateSourcesTable(list)
        const needInstall = await promptConfirm(`Are you want to install sources?`)
        if (needInstall) {
            GetCommand.run(['-m'])
        }
    }

    async generateSourcesTable(data) {
        const columns = {
            name: {
                get: row => `${row.name}`
            },
            current: {
                get: row => `${row.latest}`
            },
            description: {
                get: row => `${row.description}`
            },
            versions: {
                get: row => row.versions.reduce((prev, next) => `${prev}, ${next}`)
            }
        }
        CliUx.Table.table(Object.values(data), columns)
    }
}

DiscoverCommand.description = 'Return the list of avaliable sources';

module.exports = DiscoverCommand;
