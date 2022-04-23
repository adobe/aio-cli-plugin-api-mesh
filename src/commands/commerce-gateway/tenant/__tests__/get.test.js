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

const mockConsoleCLIInstance = {};
jest.mock('@adobe/aio-lib-env');
jest.mock('@adobe/aio-cli-lib-console');
const orgs = [{ id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' }];
const selectedOrg = { id: '1234', code: 'CODE1234@AdobeOrg', name: 'ORG01', type: 'entp' };
/**
 *
 */
function setDefaultMockConsoleCLI() {
	mockConsoleCLIInstance.getToken = jest.fn().mockReturnValue('test_token');
	mockConsoleCLIInstance.getCliEnv = jest.fn().mockReturnValue('prod');
	mockConsoleCLIInstance.getOrganizations = jest.fn().mockResolvedValue(orgs);
	mockConsoleCLIInstance.promptForSelectOrganization = jest.fn().mockResolvedValue(selectedOrg);
}
jest.mock('@adobe/aio-cli-lib-console', () => ({
	init: jest.fn().mockResolvedValue(mockConsoleCLIInstance),
	cleanStdOut: jest.fn(),
}));
jest.mock('@adobe/aio-lib-ims');
const GetCommand = require('../get');
const { SchemaServiceClient } = require('../../../../classes/SchemaServiceClient');
const mockGetTenant = require('../../../__fixtures__/sample_mesh.json');

describe('get command tests', () => {
	beforeEach(() => {
		setDefaultMockConsoleCLI();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('get-tenant-missing-tenantId', async () => {
		jest.spyOn(SchemaServiceClient.prototype, 'getTenant').mockImplementation(() => {
			throw new Error('{"message":"There was an error fetching undefined"}');
		});
		expect.assertions(2);
		const runResult = GetCommand.run([]);
		await expect(runResult instanceof Promise).toBeTruthy();
		await expect(runResult).rejects.toEqual(
			new Error('{"message":"There was an error fetching undefined"}'),
		);
	});
	test('get-tenant-with-tenantId', async () => {
		jest
			.spyOn(SchemaServiceClient.prototype, 'getTenant')
			.mockImplementation(tenantId => mockGetTenant);
		expect.assertions(1);
		const tenantId = 'sample_merchant';
		const runResult = GetCommand.run([tenantId]);
		await expect(runResult).resolves.toEqual(mockGetTenant);
	});
});
