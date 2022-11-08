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

const mockMetadataFixture = require('../__fixtures__/connectors-metadata.json');
const mockAdapter = require('source-registry-storage-adapter');
const { promptConfirm } = require('../../../../helpers');
const { CliUx } = require('@oclif/core');
const DiscoverCommand = require('../discover');
const InstallCommand = require('../install');
jest.mock('source-registry-storage-adapter');
jest.mock('../../../../helpers');
jest.mock('../get');
jest.mock('@oclif/core', () => ({
	...jest.requireActual('@oclif/core'),
	CliUx: {
		Table: {
			table: jest.fn().mockImplementation(data => data),
		},
	},
}));

mockAdapter.mockImplementation(() => ({
	getList: jest.fn().mockImplementation(() => mockMetadataFixture),
}));

describe('source:discover command tests', () => {
	test('Snapshot create command description', () => {
		expect(DiscoverCommand.description).toMatchInlineSnapshot(
			`"Return the list of avaliable sources"`,
		);
		expect(DiscoverCommand.aliases).toMatchInlineSnapshot(`Array []`);
	});
	test('Check table render is executed', async () => {
		await DiscoverCommand.run([]);
		expect(CliUx.Table.table).toHaveBeenCalledTimes(1);
	});
	test('Check that "source:install" command is called', async () => {
		InstallCommand.run = jest.fn().mockImplementation(() => 'source:install');
		promptConfirm.mockResolvedValue(true);
		await DiscoverCommand.run([]);
		expect(InstallCommand.run).toHaveBeenCalledTimes(1);
	});
	test('Check that "source:install" command is not called', async () => {
		InstallCommand.run = jest.fn().mockImplementation(() => 'source:install');
		promptConfirm.mockResolvedValue(false);
		await DiscoverCommand.run([]);
		expect(InstallCommand.run).toHaveBeenCalledTimes(0);
	});
});
