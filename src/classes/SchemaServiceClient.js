/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const got = require('got')
const { getCommerceAdminConfig } = require('../helpers')

class SchemaServiceClient {
    constructor() {
        const config = getCommerceAdminConfig()
        this.schemaManagementServiceUrl = config.baseUrl
        this.authorizationToken = config.authorizationToken
        this.apiKey = config.apiKey
        this.timeout = parseInt('1000', 10)
        this.retryCount = parseInt('2', 10)
    }
    async getTenant(tenantId) {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/api-admin/tenants/${tenantId}?api_key=${this.apiKey}`, {
                method: 'GET',
                headers: {
                    authorization: `Bearer ${this.authorizationToken}`
                },
				timeout: this.timeout,
				retry: this.retryCount,
            })
            return response && response.body && 
            response.statusCode === 200 ? 
            response.body : null
        } catch (error) {
            return null
        }
    }

    async createTenant(data) {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/api-admin/tenants?api_key=${this.apiKey}`, {
				method: 'POST',
                responseType: 'json',
                headers: { 
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${this.authorizationToken}`
                },
				body: JSON.stringify(data),
				timeout: this.timeout,
				retry: this.retryCount,
            })
            return response && response.statusCode === 201 ?
            response : null
            
        } catch (error) {
            return null
        }
    }

    async updateTenant(tenantId, data) {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/api-admin/tenants/${tenantId}?api_key=${this.apiKey}`, {
				method: 'PUT',
                responseType: 'json',
                headers: { 
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${this.authorizationToken}`
                },
				body: JSON.stringify(data),
				timeout: this.timeout,
				retry: this.retryCount,
            })
            return response && response.statusCode === 204 ?
            response : null
            
        } catch (error) {
            return null
        }
    }
}

module.exports = { SchemaServiceClient }
