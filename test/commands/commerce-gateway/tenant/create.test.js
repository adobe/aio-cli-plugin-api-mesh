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

const CreateCommand = require('../../../../src/commands/commerce-gateway/tenant/create')
const { SchemaServiceClient } = require('../../../../src/classes/SchemaServiceClient')
const mockCreateTenant = require('../../../data/sample_mesh.json')

describe('create command tests', () => {
  beforeAll(() => {
    const response = mockCreateTenant
    jest.spyOn(SchemaServiceClient.prototype, 'createTenant').mockImplementation((data) => response)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  test('create-tenant-missing-file', async () => {
    expect.assertions(2)
    const runResult = CreateCommand.run([])
    await expect(runResult instanceof Promise).toBeTruthy()
    await expect(runResult).rejects.toEqual(
      new Error('Unable to create a tenant with the given configuration')
    )
  })
  test('create-tenant-with-configuration', async () => {
    expect.assertions(2)
    const runResult = CreateCommand.run(['test/data/sample_mesh.json'])
    await expect(runResult instanceof Promise).toBeTruthy()
    await expect(runResult).resolves.toEqual(mockCreateTenant)
  })
})
