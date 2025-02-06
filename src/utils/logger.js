const pino = require('pino');

/**
 * Get a new instance of a Pino logger with default configuration.
 * @param level Log level.
 */
const pinoLogger = level =>
	pino({
		level: level || 'info',
		formatters: {
			level(label) {
				return {
					level: label,
				};
			},
		},
	});

/**
 * Get a new instance of a Pino logger with default configuration and child bindings.
 * @param bindings Logger bindings.
 */
const logger = bindings => {
	return pinoLogger(bindings?.logLevel).child({
		meshId: bindings?.meshId,
		requestId: bindings?.requestId,
	});
};

/**
 * Create a logger from environment/request.
 * @param bindings Logger bindings.
 */
const bindedlogger = bindings => {
	return logger({
		logLevel: bindings?.logLevel,
		meshId: bindings?.meshId,
		requestId: bindings?.requestId,
	});
};

module.exports = { logger, pinoLogger, bindedlogger };
