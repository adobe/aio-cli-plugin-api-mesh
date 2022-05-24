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

const axios = require('axios');
const logger = require('../classes/logger');

/**
 * This class provides methods to call Schema Management Service APIs.
 * Before calling any method initialize the instance by calling the `init` method on it
 * with valid values for baseUrl, apiKey and accessToken
 */
class SchemaServiceClient {
	init(baseUrl, accessToken, apiKey) {
		this.schemaManagementServiceUrl = baseUrl;
		this.accessToken = accessToken;
		this.apiKey = apiKey;
	}

	async getTenant(organizationCode, projectId, workspaceId, meshId) {
		logger.info(`OrgCode - getTenant: ${organizationCode}`);
		const config = {
			method: 'get',
			url: `${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${this.apiKey}`,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'x-request-id': global.requestId,
			},
		};
		try {
			const response = await axios(config);

			if (response && response.status === 200) {
				logger.info(`Mesh Config : ${JSON.stringify(response.data)}`);

				return response.data;
			} else {
				return null;
			}
		} catch (error) {
			logger.error(error);
			throw new Error(JSON.stringify(error.response.data));
		}
	}

	async createTenant(organizationCode, projectId, workspaceId, data) {
		logger.info(`OrgCode - createTenant: ${organizationCode}`);
		const config = {
			method: 'post',
			url: `${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes?api_key=${this.apiKey}`,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				'x-request-id': global.requestId,
			},
			data: JSON.stringify(data),
		};
		try {
			logger.info('here');
			const response = await axios(config);
			return response && response.status === 201 ? response : null;
		} catch (error) {
			logger.error(error);
			throw new Error(JSON.stringify(error.response.data));
		}
	}

	async updateTenant(organizationCode, projectId, workspaceId, meshId, data) {
		logger.info(`OrgCode - updateTenant: ${organizationCode}`);
		const config = {
			method: 'put',
			url: `${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${this.apiKey}`,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				'x-request-id': global.requestId,
			},
			data: JSON.stringify(data),
		};
		try {
			const response = await axios(config);
			logger.info(response.status);
			return response && response.status === 204 ? response : null;
		} catch (error) {
			logger.error(error);
			throw new Error(JSON.stringify(error.response.data));
		}
	}
}

module.exports = { SchemaServiceClient };
