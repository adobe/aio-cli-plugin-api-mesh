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

	async getMesh(organizationCode, projectId, workspaceId, meshId) {
		const config = {
			method: 'get',
			url: `${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${this.apiKey}`,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'x-request-id': global.requestId,
			},
		};

		logger.info(
			'Initiating GET %s',
			`${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${this.apiKey}`,
		);

		try {
			const response = await axios(config);

			logger.info('Response from GET %s', response.status);

			if (response && response.status === 200) {
				logger.info(`Mesh Config : ${JSON.stringify(response.data, null, 2)}`);

				return response.data;
			} else {
				logger.error(`Something went wrong: ${JSON.stringify(response.data, null, 2)}`);

				throw new Error(response.data.message);
			}
		} catch (error) {
			if (error.response) {
				// The request was made and the server responded with a status code
				logger.error('Error while getting mesh %s', JSON.stringify(error.response.data, null, 2));

				throw new Error(error.response.data.message);
			} else {
				// The request was made but no response was received
				logger.error(
					'Error while getting mesh. No response received from the server: %s',
					JSON.stringify(error, null, 2),
				);

				throw new Error('Unable to get mesh from Schema Management Service: %s', error.message);
			}
		}
	}

	async createMesh(organizationCode, projectId, workspaceId, data) {
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

		logger.info(
			'Initiating POST %s',
			`${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes?api_key=${this.apiKey}`,
		);

		try {
			const response = await axios(config);

			logger.info('Response from POST %s', response.status);

			if (response && response.status === 201) {
				logger.info(`Mesh Config : ${JSON.stringify(response.data, null, 2)}`);

				return response.data;
			} else {
				logger.error(`Something went wrong: ${JSON.stringify(response.data, null, 2)}`);

				throw new Error(response.data.message);
			}
		} catch (error) {
			if (error.response) {
				// The request was made and the server responded with a status code
				logger.error('Error while creating mesh %s', JSON.stringify(error.response.data, null, 2));

				throw new Error(error.response.data.message);
			} else {
				// The request was made but no response was received
				logger.error(
					'Error while creating mesh. No response received from the server: %s',
					JSON.stringify(error, null, 2),
				);

				throw new Error('Unable to create mesh in Schema Management Service: %s', error.message);
			}
		}
	}

	async updateMesh(organizationCode, projectId, workspaceId, meshId, data) {
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

		logger.info(
			'Initiating PUT %s',
			`${this.schemaManagementServiceUrl}/organizations/${organizationCode}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${this.apiKey}`,
		);

		try {
			const response = await axios(config);

			logger.info('Response from POST %s', response.status);

			if (response && response.status === 204) {
				return response.data;
			} else {
				logger.error(`Something went wrong: ${JSON.stringify(response.data, null, 2)}`);

				throw new Error(response.data.message);
			}
		} catch (error) {
			if (error.response) {
				// The request was made and the server responded with a status code
				logger.error('Error while updating mesh %s', JSON.stringify(error.response.data, null, 2));

				throw new Error(error.response.data.message);
			} else {
				// The request was made but no response was received
				logger.error(
					'Error while updating mesh. No response received from the server: %s',
					JSON.stringify(error, null, 2),
				);

				throw new Error('Unable to update mesh in Schema Management Service: %s', error.message);
			}
		}
	}
}

module.exports = { SchemaServiceClient };
