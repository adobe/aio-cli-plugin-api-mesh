const { default: pino } = require('pino');

const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	enabled: process.env.NODE_ENV !== 'test',
	prettyPrint: !process.env.ENVIRONMENT_NAME,
	mixin() {
		return {
			requestId: global.requestId
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
