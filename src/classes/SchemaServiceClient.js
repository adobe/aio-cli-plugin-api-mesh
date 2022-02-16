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

const axios = require('axios')

/**
 * This class provides methods to call Schema Management Service APIs.
 * Before calling any method initialize the instance by calling the `init` method on it
 * with valid values for baseUrl, apiKey and accessToken
 */
class SchemaServiceClient {
  init (baseUrl, accessToken, apiKey) {
    this.schemaManagementServiceUrl = baseUrl
    this.accessToken = accessToken
    this.apiKey = apiKey
  }

  async getTenant (tenantId, organizationCode) {
    console.log(`OrgCode - getTenant: ${organizationCode}`)
    const config = {
      method: 'get',
      url: `${this.schemaManagementServiceUrl}/api-admin/organizations/${organizationCode}/tenants/${tenantId}?api_key=${this.apiKey}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    }
    try {
      const response = await axios(config)
        console.log(`Config : ${config}`)
      return response && response.data &&
      response.status === 200
        ? response.data
        : null
    } catch (error) {
      throw new Error(JSON.stringify(error.response.data))
    }
  }

  async createTenant (data) {
    const organizationCode = data.imsOrgId
    console.log(`OrgCode - createTenant: ${organizationCode}`)
    const config = {
      method: 'post',
      url: `${this.schemaManagementServiceUrl}/api-admin/organizations/${organizationCode}/tenants?api_key=${this.apiKey}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(data)
    }
    try {
      console.log('here')
      const response = await axios(config)
      return response && response.status === 201
        ? response
        : null
    } catch (error) {
      throw new Error(JSON.stringify(error.response.data))
    }
  }

  async updateTenant (tenantId, data) {
    const organizationCode = data.imsOrgId
    console.log(`OrgCode - updateTenant: ${organizationCode}`)
    const config = {
      method: 'put',
      url: `${this.schemaManagementServiceUrl}/api-admin/organizations/${organizationCode}/tenants/${tenantId}?api_key=${this.apiKey}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(data)
    }
    try {
      const response = await axios(config)
      console.log(response.status)
      return response && response.status === 204
        ? response
        : null
    } catch (error) {
      throw new Error(JSON.stringify(error.response.data))
    }
  }
}

module.exports = { SchemaServiceClient }
