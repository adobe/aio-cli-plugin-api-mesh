/**
 * Functions to support Dev Console operations
 */
const axios = require('axios');

const logger = require('../classes/logger');
const { objToString } = require('../utils');
const CONSTANTS = require('../constants');

const { DEV_CONSOLE_TRANSPORTER_API_KEY } = CONSTANTS;

const { getDevConsoleConfig } = require('../helpers');

const getApiKeyCredential = async (organizationId, projectId, workspaceId) => {
	const { baseUrl: devConsoleUrl, accessToken } = await getDevConsoleConfig();
	const config = {
		method: 'get',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/credentials`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			'x-request-id': global.requestId,
			'x-api-key': DEV_CONSOLE_TRANSPORTER_API_KEY, // API Key for Dev Console
		},
	};

	logger.info(
		'Initiating GET %s',
		`${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/credentials`,
	);

	try {
		const response = await axios(config);

		logger.info('Response from GET %s', response.status);

		if (response && response.status === 200) {
			logger.info(`Credentials on the workspace : ${objToString(response, ['data'])}`);

			if (response.data && Array.isArray(response.data) && response.data.length > 0) {
				const apiCred = response.data.find(
					credential =>
						credential.integration_type === 'apikey' && credential.flow_type === 'adobeid',
				);

				logger.info(`API Key credential on the workspace : ${objToString(apiCred)}`);

				if (apiCred) {
					return apiCred;
				} else {
					logger.error('API Key credential not found on workspace');

					return null;
				}
			} else {
				return null;
			}
		} else {
			// Non 200 response received
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to get credential',
				)}. Received ${response.status} response instead of 200`,
			);

			throw new Error(
				`Something went wrong: ${objToString(response, ['data'], 'Unable to get credential')}`,
			);
		}
	} catch (error) {
		logger.error('Error while getting credential');
		logger.error(error);

		return null;
	}
};

const describeMesh = async (organizationId, projectId, workspaceId) => {
	logger.info('Initiating Describe Mesh');

	try {
		const meshId = await getMeshId(organizationId, projectId, workspaceId);

		logger.info('Response from getMeshId %s', meshId);

		if (meshId) {
			const credential = await getApiKeyCredential(organizationId, projectId, workspaceId);

			if (credential) {
				return { meshId, apiKey: credential.client_id };
			} else {
				logger.error('API Key credential not found on workspace');

				return { meshId, apiKey: null };
			}
		} else {
			logger.error(`Unable to retrieve meshId.`);

			throw new Error(`Unable to retrieve meshId.`);
		}
	} catch (error) {
		logger.error(error);

		return null;
	}
};

const getMesh = async (organizationId, projectId, workspaceId, meshId) => {
	const { baseUrl: devConsoleUrl, accessToken, apiKey } = await getDevConsoleConfig();
	const config = {
		method: 'get',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?API_KEY=${apiKey}`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'x-request-id': global.requestId,
		},
	};

	logger.info(
		'Initiating GET %s',
		`${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?API_KEY=${apiKey}`,
	);

	try {
		const response = await axios(config);

		logger.info('Response from GET %s', response.status);

		if (response && response.status === 200) {
			logger.info(`Mesh Config : ${objToString(response, ['data'])}`);

			return response.data;
		} else {
			// Non 200 response received
			logger.error(
				`Something went wrong: ${objToString(response, ['data'], 'Unable to get mesh')}. Received ${
					response.status
				} response instead of 200`,
			);

			throw new Error(
				`Something went wrong: ${objToString(response, ['data'], 'Unable to get mesh')}`,
			);
		}
	} catch (error) {
		logger.info('Response from GET %s', error.response.status);

		if (error.response.status === 404) {
			// The request was made and the server responded with a 404 status code
			logger.error('Mesh not found');

			return null;
		} else if (error.response && error.response.data) {
			// The request was made and the server responded with an unsupported status code
			logger.error(
				'Error while getting mesh. Response: %s',
				objToString(error, ['response', 'data'], 'Unable to get mesh'),
			);

			if (error.response.data.messages) {
				const message = objToString(
					error,
					['response', 'data', 'messages', '0', 'message'],
					'Unable to get mesh',
				);

				throw new Error(message);
			} else if (error.response.data.message) {
				const message = objToString(error, ['response', 'data', 'message'], 'Unable to get mesh');

				throw new Error(message);
			} else {
				const message = objToString(error, ['response', 'data'], 'Unable to get mesh');

				throw new Error(message);
			}
		} else {
			// The request was made but no response was received
			logger.error(
				'Error while getting mesh. No response received from the server: %s',
				objToString(error, [], 'Unable to get mesh'),
			);

			throw new Error('Unable to get mesh from Schema Management Service: %s', error.message);
		}
	}
};

const createMesh = async (organizationId, projectId, workspaceId, data) => {
	const { baseUrl: devConsoleUrl, accessToken, apiKey } = await getDevConsoleConfig();
	const config = {
		method: 'post',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes?API_KEY=${apiKey}`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			'x-request-id': global.requestId,
		},
		data: JSON.stringify(data),
	};

	logger.info(
		'Initiating POST %s',
		`${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes?API_KEY=${apiKey}`,
	);

	try {
		const response = await axios(config);

		logger.info('Response from POST %s', response.status);

		if (response && response.status === 201) {
			logger.info(`Mesh Config : ${objToString(response, ['data'])}`);
			return response.data;
		} else {
			// Non 201 response received
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to create mesh',
				)}. Received ${response.status} response instead of 201`,
			);

			throw new Error(response.data.message);
		}
	} catch (error) {
		if (error.response.status === 409) {
			// The request was made and the server responded with a 409 status code
			logger.error('Error while creating mesh: %j', error.response.data);

			throw new Error('Selected org, project and workspace already has a mesh');
		} else if (error.response && error.response.data) {
			// The request was made and the server responded with an unsupported status code
			logger.error(
				'Error while creating mesh. Response: %s',
				objToString(error, ['response', 'data'], 'Unable to create mesh'),
			);

			if (error.response.data.messages) {
				const message = objToString(
					error,
					['response', 'data', 'messages'],
					'Unable to create mesh',
				);

				throw new Error(message);
			} else if (error.response.data.message) {
				const message = objToString(
					error,
					['response', 'data', 'message'],
					'Unable to create mesh',
				);

				throw new Error(message);
			} else {
				const message = objToString(error, ['response', 'data'], 'Unable to create mesh');

				throw new Error(message);
			}
		} else {
			// The request was made but no response was received
			logger.error(
				'Error while creating mesh. No response received from the server: %s',
				objToString(error, [], 'Unable to create mesh'),
			);

			throw new Error('Unable to create mesh in Schema Management Service: %s', error.message);
		}
	}
};

const updateMesh = async (organizationId, projectId, workspaceId, meshId, data) => {
	const { baseUrl: devConsoleUrl, accessToken, apiKey } = await getDevConsoleConfig();
	const config = {
		method: 'put',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?API_KEY=${apiKey}`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			'x-request-id': global.requestId,
		},
		data: JSON.stringify(data),
	};

	logger.info(
		'Initiating PUT %s',
		`${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?API_KEY=${apiKey}`,
	);

	try {
		const response = await axios(config);

		logger.info('Response from POST %s', response.status);

		if (response && response.status === 204) {
			return response.data;
		} else {
			// Non 204 response received
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to update mesh',
				)}. Received ${response.status} response instead of 204`,
			);

			throw new Error(
				`Something went wrong: ${objToString(response, ['data'], 'Unable to update mesh')}`,
			);
		}
	} catch (error) {
		logger.info('Response from PUT %s', error.response.status);

		if (error.response.status === 404) {
			// The request was made and the server responded with a 404 status code
			logger.error('Mesh not found');

			throw new Error('Mesh not found');
		} else if (error.response && error.response.data) {
			// The request was made and the server responded with an unsupported status code
			logger.error(
				'Error while updating mesh. Response: %s',
				objToString(error, ['response', 'data'], 'Unable to update mesh'),
			);

			if (error.response.data.messages) {
				const message = objToString(
					error,
					['response', 'data', 'messages', '0', 'message'],
					'Unable to update mesh',
				);

				throw new Error(message);
			} else if (error.response.data.message) {
				const message = objToString(
					error,
					['response', 'data', 'message'],
					'Unable to update mesh',
				);

				throw new Error(message);
			} else {
				const message = objToString(error, ['response', 'data'], 'Unable to update mesh');

				throw new Error(message);
			}
		} else {
			// The request was made but no response was received
			logger.error(
				'Error while updating mesh. No response received from the server: %s',
				objToString(error, [], 'Unable to update mesh'),
			);

			throw new Error('Unable to update mesh from Schema Management Service: %s', error.message);
		}
	}
};

const deleteMesh = async (organizationId, projectId, workspaceId, meshId) => {
	const { baseUrl: devConsoleUrl, accessToken, apiKey } = await getDevConsoleConfig();
	const config = {
		method: 'delete',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?API_KEY=${apiKey}`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'x-request-id': global.requestId,
		},
	};

	logger.info(
		'Initiating DELETE %s',
		`${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?API_KEY=${apiKey}`,
	);

	try {
		const response = await axios(config);

		logger.info('Response from DELETE %s', response.status);

		if (response && response.status === 204) {
			return response;
		} else {
			// Non 204 response received
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to delete mesh',
				)}. Received ${response.status} response instead of 204`,
			);

			throw new Error(
				`Something went wrong: ${objToString(response, ['data'], 'Unable to delete mesh')}`,
			);
		}
	} catch (error) {
		logger.info('Response from DELETE %s', error.response.status);

		if (error.response.status === 404) {
			// The request was made and the server responded with a 404 status code
			logger.error('Mesh not found');

			throw new Error('Mesh not found');
		} else if (error.response && error.response.data) {
			// The request was made and the server responded with an unsupported status code
			logger.error(
				'Error while deleting mesh. Response: %s',
				objToString(error, ['response', 'data'], 'Unable to delete mesh'),
			);

			if (error.response.data.messages) {
				const message = objToString(
					error,
					['response', 'data', 'messages', '0', 'message'],
					'Unable to delete mesh',
				);

				throw new Error(message);
			} else if (error.response.data.message) {
				const message = objToString(
					error,
					['response', 'data', 'message'],
					'Unable to delete mesh',
				);

				throw new Error(message);
			} else {
				const message = objToString(error, ['response', 'data'], 'Unable to delete mesh');

				throw new Error(message);
			}
		} else {
			// The request was made but no response was received
			logger.error(
				'Error while deleting mesh. No response received from the server: %s',
				objToString(error, [], 'Unable to delete mesh'),
			);

			throw new Error('Unable to delete mesh from Schema Management Service: %s', error.message);
		}
	}
};

const getMeshId = async (organizationId, projectId, workspaceId) => {
	const { baseUrl: devConsoleUrl, accessToken, apiKey } = await getDevConsoleConfig();
	logger.info('Initiating Mesh ID request');

	const config = {
		method: 'get',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/describe?API_KEY=${apiKey}`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'x-request-id': global.requestId,
		},
	};

	logger.info(
		'Initiating GET %s',
		`${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/describe?API_KEY=${apiKey}`,
	);

	try {
		const response = await axios(config);

		logger.info('Response from GET %s', response.status);

		if (response && response.status === 200) {
			logger.info(`Mesh Config : ${objToString(response, ['data'])}`);

			return response.data.meshId;
		} else {
			// Non 200 response received
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to get mesh ID',
				)}. Received ${response.status} response instead of 200`,
			);

			throw new Error(
				`Something went wrong: ${objToString(response, ['data'], 'Unable to get mesh')}`,
			);
		}
	} catch (error) {
		if (error.response.status === 400) {
			// The request was made and the server responded with a 400 status code
			logger.error('Mesh not found');
		} else {
			// The request was made and the server responded with a different status code
			logger.error('Error while describing mesh');
		}

		return null;
	}
};

const createAPIMeshCredentials = async (organizationId, projectId, workspaceId) => {
	const { baseUrl: devConsoleUrl, accessToken } = await getDevConsoleConfig();
	const input = {
		name: `Project ${Date.now()}K`,
		description: `Project ${Date.now()}K`,
		platform: 'apiKey',
		domain: 'www.graph.adobe.io',
	};
	const credentialConfig = {
		method: 'post',
		url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/credentials/adobeId`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			'x-request-id': global.requestId,
			'x-api-key': DEV_CONSOLE_TRANSPORTER_API_KEY,
		},
		data: JSON.stringify(input),
	};
	try {
		const response = await axios(credentialConfig);
		if (response && response.status === 200) {
			logger.info(`API Key credential  : ${objToString(response, ['data'])}`);

			return response.data;
		} else {
			// Receive a non 200 response
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to create credential',
				)}. Received ${response.status} response instead of 200`,
			);

			throw new Error(response.data.message);
		}
	} catch (error) {
		logger.info('Response from Create Mesh Credential %s', error.response.status);
		return null;
	}
};

const getListOfCurrentServices = async (organizationId, credentialId) => {
	const { baseUrl: devConsoleUrl, accessToken } = await getDevConsoleConfig();
	try {
		const config = {
			method: 'get',
			url: `${devConsoleUrl}/organizations/${organizationId}/integrations/${credentialId}`,
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'x-request-id': global.requestId,
				'x-api-key': DEV_CONSOLE_TRANSPORTER_API_KEY,
			},
		};

		const response = await axios(config);

		if (response && response.status === 200) {
			logger.info(`List of current services: ${objToString(response, ['data'])}`);

			return response.data.sdkList;
		} else {
			// Receive a non 200 response
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to get list of current services',
				)}. Received ${response.status} response instead of 200`,
			);

			throw new Error(response.data.message);
		}
	} catch (err) {
		logger.error(`Error while getting list of services: ${err}`);

		return null;
	}
};

const subscribeCredentialToServices = async (
	organizationId,
	projectId,
	workspaceId,
	credentialType,
	credentialId,
	services,
) => {
	try {
		const { baseUrl: devConsoleUrl, accessToken } = await getDevConsoleConfig();

		const input = services.map(service => ({
			sdkCode: service,
		}));

		const subscribeCredentialToService = {
			method: 'put',
			url: `${devConsoleUrl}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/credentials/${credentialType}/${credentialId}/services`,
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'x-request-id': global.requestId,
				'x-api-key': DEV_CONSOLE_TRANSPORTER_API_KEY,
			},
			data: JSON.stringify(input),
		};

		const response = await axios(subscribeCredentialToService);

		if (response && response.status === 200) {
			logger.info(`SDK codes associated with credential  : ${objToString(response, ['data'])}`);

			return response.data.sdkList.map(({ service }) => service);
		} else {
			// Receive a non 200 response
			logger.error(
				`Something went wrong: ${objToString(
					response,
					['data'],
					'Unable to create credential',
				)}. Received ${response.status} response instead of 200`,
			);

			throw new Error(response.data.message);
		}
	} catch (err) {
		logger.error(`Error while subscribing credential to services: ${err}`);

		return null;
	}
};

const subscribeCredentialToMeshService = async (
	organizationId,
	projectId,
	workspaceId,
	credentialId,
) => {
	const credentialType = 'adobeid';

	try {
		const currentListOfServices = await getListOfCurrentServices(organizationId, credentialId);

		if (!currentListOfServices) {
			throw new Error('Unable to get list of current services');
		}

		if (currentListOfServices.includes('GraphQLServiceSDK')) {
			logger.info('Service is already subscribed');

			return currentListOfServices;
		}

		const newListOfServices = [...currentListOfServices, 'GraphQLServiceSDK'];

		const sdkList = await subscribeCredentialToServices(
			organizationId,
			projectId,
			workspaceId,
			credentialType,
			credentialId,
			newListOfServices,
		);

		logger.info(`Successfully subscribed credential to services: ${sdkList}`);

		return sdkList;
	} catch (error) {
		logger.info('Response from subscribe credential %s', error.response);

		if (error.response.status === 404) {
			// The request was made and the server responded with a 404 status code
			logger.error('Credential not found');
			return [];
		}

		return null;
	}
};

const unsubscribeCredentialFromMeshService = async (
	organizationId,
	projectId,
	workspaceId,
	credentialId,
) => {
	const credentialType = 'adobeid';

	try {
		const currentListOfServices = await getListOfCurrentServices(organizationId, credentialId);

		if (!currentListOfServices) {
			throw new Error('Unable to get list of current services');
		}

		if (!currentListOfServices.includes('GraphQLServiceSDK')) {
			logger.info('Service is not subscribed');

			return currentListOfServices;
		}

		const newListOfServices = currentListOfServices.filter(
			service => service !== 'GraphQLServiceSDK',
		);

		const sdkList = await subscribeCredentialToServices(
			organizationId,
			projectId,
			workspaceId,
			credentialType,
			credentialId,
			newListOfServices,
		);

		logger.info(`Successfully unsubscribed credential to services: ${sdkList}`);

		return sdkList;
	} catch (error) {
		logger.info('Response from unsubscribe credential %s', error.response);

		if (error.response.status === 404) {
			// The request was made and the server responded with a 404 status code
			logger.error('Credential not found');
			return [];
		}

		return null;
	}
};

module.exports = {
	getApiKeyCredential,
	describeMesh,
	getMesh,
	createMesh,
	updateMesh,
	deleteMesh,
	getMeshId,
	createAPIMeshCredentials,
	getListOfCurrentServices,
	subscribeCredentialToServices,
	subscribeCredentialToMeshService,
	unsubscribeCredentialFromMeshService,
};
