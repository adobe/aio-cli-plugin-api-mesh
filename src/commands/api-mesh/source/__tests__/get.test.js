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
const mockSourceTest01v1Fixture = require('../__fixtures__/0.0.1-test-01.json');
const mockSourceTest02v1Fixture = require('../__fixtures__/0.0.1-test-02.json');
const mockAdapter = require('connector-registry-storage-adapter');
const chalk = require('chalk');
const ncp = require('copy-paste');
const { promptMultiselect, promptSelect, promptConfirm } = require('../../../../helpers');
const mockSources = {
	'0.0.1-test-01': mockSourceTest01v1Fixture,
	'0.0.1-test-02': mockSourceTest02v1Fixture,
};
jest.mock('connector-registry-storage-adapter');
jest.mock('../../../../helpers');
const GetCommand = require('../get');
const logSpy = jest.spyOn(GetCommand.prototype, 'log');
const expectedResultForSuccessScenarios = JSON.stringify(
	[mockSourceTest01v1Fixture.provider, mockSourceTest02v1Fixture.provider],
	null,
	4,
);
mockAdapter.mockImplementation(() => ({
	get: jest
		.fn()
		.mockResolvedValueOnce(mockSources[`0.0.1-test-01`])
		.mockResolvedValueOnce(mockSources[`0.0.1-test-02`]),
	getList: jest.fn().mockImplementation(() => mockMetadataFixture),
}));
promptMultiselect.mockResolvedValue(Object.values(mockMetadataFixture));
promptConfirm.mockResolvedValue(true);
promptSelect
	.mockResolvedValueOnce(
		`${mockMetadataFixture['test-01'].name}@${mockMetadataFixture['test-01'].latest}`,
	)
	.mockResolvedValueOnce(
		`${mockMetadataFixture['test-02'].name}@${mockMetadataFixture['test-02'].latest}`,
	);

describe('source:get command tests', () => {
	test('Check executing without parameters', async () => {
		await GetCommand.run([]).catch(err => {
			expect(err).toHaveProperty(
				'message',
				expect.stringMatching(
					`The "aio api-mesh:source:get" command require additional parameters` +
						`\nUse "aio api-mesh:source:get --help" to see parameters information.`,
				),
			);
		});
	});
	test('Check executing success with multiple, copied to clipboard and logged to console', async () => {
		await GetCommand.run(['-m']);
		expect(ncp.paste()).toEqual(expectedResultForSuccessScenarios);
		expect(logSpy.mock.calls.pop()[0]).toEqual(expectedResultForSuccessScenarios);
	});
	test('Check executing success with provided name and version, copied to clipboard and logged to console', async () => {
		await GetCommand.run(['-s=test-01@0.0.1', '-s=test-02@0.0.1']);
		expect(ncp.paste()).toEqual(expectedResultForSuccessScenarios);
		expect(logSpy.mock.calls.pop()[0]).toEqual(expectedResultForSuccessScenarios);
	});
	test('Check executing success with provided name and without version, copied to clipboard and logged to console', async () => {
		await GetCommand.run(['-s=test-01', '-s=test-02']);
		expect(ncp.paste()).toEqual(expectedResultForSuccessScenarios);
		expect(logSpy.mock.calls.pop()[0]).toEqual(expectedResultForSuccessScenarios);
	});
	test('Check executing failed due to requested source does not exist', async () => {
		const name = 'test-99';
		await GetCommand.run([`-s=${name}`]).catch(err => {
			expect(err.message).toEqual(
				chalk.red(
					`The source with the name "${name}" doesn't exist.` +
						`\nUse "aio api-mesh:source:discover" command to see avaliable sources.`,
				),
			);
		});
	});
	test('Check executing failed due to requested version does not exist', async () => {
		const name = 'test-01';
		const version = '1.1.1';
		await GetCommand.run([`-s=${name}@${version}`]).catch(err => {
			expect(err.message).toEqual(
				chalk.red(
					`The version "${version}" for source name "${name}" doesn't exist.` +
						`\nUse "aio api-mesh:source:discover" command to see avaliable source versions.`,
				),
			);
		});
	});
});
