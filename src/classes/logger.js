const { default: pino } = require('pino');
const requestContext = require('request-context');

const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	enabled: process.env.NODE_ENV !== 'test',
	prettyPrint: !process.env.ENVIRONMENT_NAME,
	mixin() {
		return {
			requestId: requestContext.get('requestId'),
		};
	},
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
		},
	},
});

module.exports = logger;
