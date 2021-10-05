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

const Config = require('@adobe/aio-lib-core-config')
const fs = require('fs')

function getCommerceAdminConfig() {
    configFile = Config.get('aio-cli-plugin-commerce-admin')
    try {
        const data = JSON.parse((fs.readFileSync(configFile,
            {encoding:'utf8', flag:'r'})))
        return {
            "baseUrl": data.baseUrl || 'https://commerce.adobe.io',
            "authorizationToken": data.authorizationToken,
            "apiKey": data.apiKey
        }
    } catch(error) {
        return null
    }
}

module.exports = {
    getCommerceAdminConfig
}
