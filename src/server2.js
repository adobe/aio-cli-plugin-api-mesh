// eslint-disable-next-line no-unused-vars
const { unstable_dev, Unstable_DevWorker, Unstable_DevOptions } = require('wrangler');
const { readSecretsFile } = require('./serverUtils');
const { join } = require('node:path');

/**
 * @type {Unstable_DevWorker}
 */
let worker;

/**
 * Handle shutdown of the Worker.
 * @returns {Promise<void>}
 */
const handleShutdown = async () => {
	if (worker) {
		await worker.stop();
	}
};

/**
 * Listen for process signals and handle shutdown.
 */
process.on('exit', handleShutdown);
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('uncaughtException', async err => {
	console.error(`\nUncaught exception: ${err.message}`);
	await handleShutdown();
});

/**
 * Run the local server
 * @param command {Command} CLI command
 * @param port {number} Port number
 * @param debug {boolean} Whether to enable debugging
 * @param inspectPort {number?} Inspector port number
 * @returns {Promise<{address: string, inspectPort: number, port: number}>}
 */
const runServer = async (command, port, debug, inspectPort) => {
	const indexFilePath = `${__dirname}/index.js`;
	const index2 = join(process.cwd(), 'index.ts');
	const filePath = '.mesh';
	const secrets = readSecretsFile(filePath);

	/**
	 * Dev options.
	 * @type {Unstable_DevOptions}
	 */
	const options = {
        config: join(__dirname, '../wrangler.toml'),
		experimental: { disableExperimentalWarning: true },
		port: port || 5000,
		vars: {
			Secret: JSON.stringify(secrets),
		},
		compatibilityDate: '2024-06-03',
		logLevel: process.env.ENABLE_LOGGER
			? process.env.LOG_LEVEL
				? process.env.LOG_LEVEL
				: 'info'
			: 'info',
	};
	if (debug) {
		options.inspect = true;
		options.inspectorPort = inspectPort || 9229;
	}
	worker = await unstable_dev(index2, options);
	return {
		address: worker.address,
		inspectPort: options.inspectorPort,
		port: worker.port,
	};
};

module.exports = { runServer };
