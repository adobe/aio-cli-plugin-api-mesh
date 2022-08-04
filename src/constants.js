const { getCliEnv } = require('@adobe/aio-lib-env');

const clientEnv = getCliEnv();

const StageConstants = {
	MULTITENANT_GRAPHQL_SERVER_BASE_URL: 'https://graph-stage.adobe.io/api',
	DEV_CONSOLE_BASE_URL: 'https://developers-stage.adobe.io/console',
	DEV_CONSOLE_API_KEY: 'adobe-api-manager-sms-stage',
	AIO_CLI_API_KEY: 'aio-cli-console-auth-stage',
};

const ProdConstants = {
	MULTITENANT_GRAPHQL_SERVER_BASE_URL: 'https://graph.adobe.io/api',
	DEV_CONSOLE_BASE_URL: 'https://developers.adobe.io/console',
	DEV_CONSOLE_API_KEY: 'adobe-graph-prod',
	AIO_CLI_API_KEY: 'aio-cli-console-auth',
};

module.exports = clientEnv === 'stage' ? StageConstants : ProdConstants;
