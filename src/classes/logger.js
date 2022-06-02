const { default: pino } = require('pino');

const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	enabled: process.env.ENABLE_LOGGER === 'true',
	mixin() {
		return {
			requestId: global.requestId,
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
