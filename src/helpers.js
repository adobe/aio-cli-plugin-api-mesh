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
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const fs = require('fs')
const libConsoleCLI = require('@adobe/aio-cli-lib-console')
const { SchemaServiceClient } = require('./classes/SchemaServiceClient')
const { getCliEnv } = require('@adobe/aio-lib-env')
const aioConsoleLogger = require('@adobe/aio-lib-core-logging')('@magento/aio-cli-plugin-commerce-admin', { provider: 'debug' })
const CONSOLE_CONFIG_KEYS = {
  CONSOLE: 'console',
  ORG: 'org'
}
const CONSOLE_API_KEYS = {
  prod: 'aio-cli-console-auth',
  stage: 'aio-cli-console-auth-stage'
}

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
 * @returns {string}
 */
async function initWithLoginAndOrg () {
  console.log('Waiting for LibConsoleCLI')
  const consoleCLI = await getLibConsoleCLI()
  const organizations = await consoleCLI.getOrganizations()
  aioConsoleLogger.debug('Get the selected organization')
  const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations)
  aioConsoleLogger.debug('Set console config')
  const key = CONSOLE_CONFIG_KEYS.ORG
  Config.set(`${CONSOLE_CONFIG_KEYS.CONSOLE}.${key}`, { id: selectedOrg.id, code: selectedOrg.code, name: selectedOrg.name })
  return selectedOrg.code
}
/**
 * @private
 */
async function getLibConsoleCLI () {
  if (!this.consoleCLI) {
    console.log(this.consoleCLI)
    console.log('CLI needs to be set and initiate auth login')
    await context.setCli({ 'cli.bare-output': true }, false)
    const clientEnv = getCliEnv()
    console.log('Retrieve CLI token')
    this.accessToken = await getToken(CLI)
    this.consoleCLI = await libConsoleCLI.init({ accessToken: this.accessToken, apiKey: CONSOLE_API_KEYS[clientEnv], env: clientEnv })
  }
  console.log('Already logged in and CLI has been initialized')
  return this.consoleCLI
}

/**
 * @returns {any} Returns an object with properties ready for consumption
 */
async function initSdk () {
  const imsOrgId = await initWithLoginAndOrg()
  console.log('initialized user login and selected Org')
  const { baseUrl, authorizationToken, apiKey } = await getCommerceAdminConfig()
  const schemaServiceClient = new SchemaServiceClient()
  schemaServiceClient.init(baseUrl, authorizationToken, apiKey)
  return {
    schemaServiceClient: schemaServiceClient,
    imsOrgId: imsOrgId
  }
}

module.exports = {
  getCommerceAdminConfig,
  initSdk
}
