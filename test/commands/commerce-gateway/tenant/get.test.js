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

const GetCommand = require('../../../../src/commands/commerce-gateway/tenant/get')
const { SchemaServiceClient } = require('../../../../src/classes/SchemaServiceClient')

const tenantId = 'test-tenant'
const mockGetTenant = {"lastUpdated":"1633456269835","imsOrgId":"1234","meshConfig":{"sources":[{"name":"MagentoMonolithApi","handler":{"graphql":{"endpoint":"https://master-7rqtwti-eragxvhtzr4am.us-4.magentosite.cloud/graphql"}}},{"name":"MagentoLiveSearchApi","handler":{"graphql":{"endpoint":"https://commerce-int.adobe.io/search/graphql","operationHeaders":{"Magento-Store-View-Code":"default","Magento-Website-Code":"base","Magento-Store-Code":"main_website_store","Magento-Environment-Id":"priya-premium-search-devcloud","x-api-key":"search_gql","Content-Type":"application/json"},"schemaHeaders":{"Magento-Store-View-Code":"default","Magento-Website-Code":"base","Magento-Store-Code":"main_website_store","Magento-Environment-Id":"priya-premium-search-devcloud","x-api-key":"search_gql","Content-Type":"application/json"}}}}]},"tenantId":tenantId}

describe('get command tests', () => {

    beforeAll(() => {
        jest.spyOn(SchemaServiceClient.prototype, 'getTenant').mockImplementation((tenantId) => mockGetTenant);
    });
    
    afterAll(() => {
        jest.restoreAllMocks();
    });

    test('get-tenant-missing-tenantId', async () => {
        expect.assertions(2)
        const runResult = GetCommand.run([])
        await expect(runResult instanceof Promise).toBeTruthy()
        await expect(runResult).rejects.toEqual(
            new Error('Unable to retrieve the tenant config for undefined')
        )
    })
    test('get-tenant-with-tenantId', async () => {
        expect.assertions(1)
        const runResult = GetCommand.run([tenantId])
        await expect(runResult).resolves.toEqual(mockGetTenant)
    })
    
  })

