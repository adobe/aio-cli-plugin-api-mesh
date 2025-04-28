const { getCliEnv } = require('@adobe/aio-lib-env');
const dotenv = require('dotenv');

dotenv.config();
const clientEnv = getCliEnv();

const StageConstants = {
	DEV_CONSOLE_BASE_URL: 'https://developers-stage.adobe.io/console',
	DEV_CONSOLE_API_KEY: 'adobe-api-manager-sms-stage',
	DEV_CONSOLE_TRANSPORTER_API_KEY: 'UDPWeb1',
	AIO_CLI_API_KEY: 'aio-cli-console-auth-stage',
	SMS_BASE_URL: 'https://graph-stage.adobe.io/api-admin',
	MESH_BASE_URL: 'https://edge-stage-graph.adobe.io/api',
	SMS_API_KEY: 'adobe-graph-stage-onboarding',
};

const ProdConstants = {
	DEV_CONSOLE_BASE_URL: 'https://developers.adobe.io/console',
	DEV_CONSOLE_API_KEY: 'adobe-graph-prod',
	DEV_CONSOLE_TRANSPORTER_API_KEY: 'UDPWeb1',
	AIO_CLI_API_KEY: 'aio-cli-console-auth',
	SMS_BASE_URL: 'https://graph.adobe.io/api-admin',
	MESH_BASE_URL: 'https://edge-graph.adobe.io/api',
	MESH_SANDBOX_BASE_URL: 'https://edge-sandbox-graph.adobe.io/api',
	SMS_API_KEY: 'adobe-graph-prod',
};

const envConstants = clientEnv === 'stage' ? StageConstants : ProdConstants;

// Export environment variables/constants
module.exports = {
	DEV_CONSOLE_BASE_URL: process.env.DEV_CONSOLE_BASE_URL || envConstants.DEV_CONSOLE_BASE_URL,
	DEV_CONSOLE_API_KEY: process.env.DEV_CONSOLE_API_KEY || envConstants.DEV_CONSOLE_API_KEY,
	DEV_CONSOLE_TRANSPORTER_API_KEY:
		process.env.DEV_CONSOLE_TRANSPORTER_API_KEY || envConstants.DEV_CONSOLE_TRANSPORTER_API_KEY,
	AIO_CLI_API_KEY: process.env.AIO_CLI_API_KEY || envConstants.AIO_CLI_API_KEY,
	SMS_BASE_URL: process.env.SMS_BASE_URL || envConstants.SMS_BASE_URL,
	MESH_BASE_URL: process.env.MESH_BASE_URL || envConstants.MESH_BASE_URL,
	MESH_SANDBOX_BASE_URL: process.env.MESH_SANDBOX_BASE_URL || envConstants.MESH_SANDBOX_BASE_URL,
	SMS_API_KEY: process.env.SMS_API_KEY || envConstants.SMS_API_KEY,
};
