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

const UpdateCommand = require('../../../../src/commands/commerce-gateway/tenant/update')
const { SchemaServiceClient } = require('../../../../src/classes/SchemaServiceClient')
const mockUpdateTenant = require('../../../data/sample_mesh.json')

describe('update command tests', () => {
  beforeAll(() => {
    const response = mockUpdateTenant
    jest.spyOn(SchemaServiceClient.prototype, 'updateTenant').mockImplementation((data) => response)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  test('update-tenant-missing-tenantId-file', async () => {
    expect.assertions(2)
    const runResult = UpdateCommand.run([])
    await expect(runResult instanceof Promise).toBeTruthy()
    await expect(runResult).rejects.toEqual(
      new Error('Unable to update the tenant with the given configuration')
    )
  })
  test('update-tenant-with-configuration', async () => {
    expect.assertions(2)
    const runResult = UpdateCommand.run(['sample_merchant', 'test/data/sample_mesh.json'])
    await expect(runResult instanceof Promise).toBeTruthy()
    await expect(runResult).resolves.toEqual(mockUpdateTenant)
  })
})
