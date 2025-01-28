// const { spawn } = require('child_process');
const { readSecretsFile } = require('./serverUtils');
// eslint-disable-next-line no-unused-vars
const { unstable_dev, Unstable_DevWorker } = require('wrangler');

/**
 * @type {Unstable_DevWorker}
 */
let worker;

/**
 * Handle shutdown of the Worker.
 * @returns {Promise<void>}
 */
const handleShutdown = async code => {
	console.info(`Server exited with code ${code}`);
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
	console.error(`Uncaught exception: ${err.message}`);
	await handleShutdown(1);
});

/**
 * Run the local server.
 * @param portNo Port number.
 * @returns {Promise<void>}
 */
const runServer = async portNo => {
	const indexFilePath = `${__dirname}/index.js`;
	const filePath = '.mesh';
	const secrets = readSecretsFile(filePath);
	worker = await unstable_dev(indexFilePath, {
		experimental: { disableExperimentalWarning: true },
		port: portNo,
		vars: {
			secrets: JSON.stringify(secrets),
		},
	});
};
//
// const runServer2 = (meshId, portNo) => {
// 	const wranglerPath = `${__dirname}/../node_modules/.bin/wrangler`;
// 	const indexFilePath = `${__dirname}/index.js`;
// 	const filePath = '.mesh';
// 	const secrets = readSecretsFile(filePath);
// 	const commandArgs = [
// 		'dev',
// 		indexFilePath,
// 		'--var',
// 		`MESH_ID:${meshId}`,
// 		`Secret:${JSON.stringify(secrets)}`,
// 		'--port',
// 		portNo,
// 	];
//
// 	const wrangler = spawn(wranglerPath, commandArgs, {
// 		stdio: 'inherit',
// 	});
//
// 	wrangler.on('close', code => {
// 		console.log(`wrangler dev process exited with code ${code}`);
// 	});
//
// 	wrangler.on('error', error => {
// 		console.error(`Failed to start wrangler dev: ${error.message}`);
// 	});
// };

module.exports = { runServer };
