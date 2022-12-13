const axios = require('axios');

const logger = require('../classes/logger');
const { objToString } = require('../utils');
const CONSTANTS = require('../constants');
const { getDevConsoleConfig } = require('../helpers');

const { DEV_CONSOLE_API_KEY, SMS_BASE_URL } = CONSTANTS;

const getMeshStatus = async (meshId, organizationId, projectId, workspaceId) => {
	logger.info('Initiating Get Mesh Status');

    const { accessToken } = await getDevConsoleConfig();
	logger.info('Initiating Mesh ID request');

	const config = {
		method: 'get',
		url: `${SMS_BASE_URL}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${DEV_CONSOLE_API_KEY}`,
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'x-request-id': global.requestId,
		},
	};

    logger.info(
		'Initiating GET %s',
		`${SMS_BASE_URL}/organizations/${organizationId}/projects/${projectId}/workspaces/${workspaceId}/meshes/${meshId}?api_key=${DEV_CONSOLE_API_KEY}`,
	);

    try {
		const response = await axios(config);
		logger.info('Response from GET %s', response.status);
        
        if (response && response.status === 200) {
			logger.info(`Mesh status : ${objToString(response, ['data'])}`);

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
}

module.exports = {
    getMeshStatus
}
