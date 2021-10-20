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

const Config = require('@adobe/aio-lib-core-config')
const { getToken, Ims } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const fs = require('fs')
const { SchemaServiceClient } = require('./classes/SchemaServiceClient')

/**
 * @returns {any} Returns a config object or null
 */
async function getCommerceAdminConfig () {
  const configFile = Config.get('aio-cli-plugin-commerce-admin')
  try {
    const data = JSON.parse((fs.readFileSync(configFile,
      { encoding: 'utf8', flag: 'r' })))
    return {
      baseUrl: data.baseUrl || 'https://commerce.adobe.io',
      authorizationToken: data.authorizationToken,
      apiKey: data.apiKey
    }
  } catch (error) {
    return null
  }
}

/**
 * Returns and validates imsOrgId
 *
 * @returns {string}
 */
async function getCliOrgId () {
  const organizationId = Config.get('console.org.code')
  return validateImsOrg(organizationId)
}

/**
 * @param organizationId
 * @returns {string}
 */
async function validateImsOrg (organizationId) {
  const contextName = CLI
  const accessToken = await getToken(contextName)
  const ims = await Ims.fromToken(accessToken)
  const allOrganizations = await ims.ims.getOrganizations(accessToken)
  return allOrganizations.find(org => {
    return organizationId === getFullOrgIdentity(org)
  }) ? organizationId : null
}

/**
 * @param org
 * @returns {string}
 */
function getFullOrgIdentity (org) {
  return `${org.orgRef.ident}@${org.orgRef.authSrc}`
}

/**
 * @returns {any} Returns an object with properties ready for consumption
 */
async function initSdk () {
  const { baseUrl, authorizationToken, apiKey } = await getCommerceAdminConfig()
  const schemaServiceClient = new SchemaServiceClient()
  schemaServiceClient.init(baseUrl, authorizationToken, apiKey)
  return {
    schemaServiceClient: schemaServiceClient,
    imsOrgId: await getCliOrgId()
  }
}

module.exports = {
  getCommerceAdminConfig,
  getCliOrgId,
  initSdk
}
