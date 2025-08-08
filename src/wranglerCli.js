const { spawn } = require('child_process');
const { readSecretsFile } = require('./serverUtils');
const packageData = require('../package.json');
const { join } = require('node:path');
const fs = require('node:fs');

/**
 * Starts the wrangler dev server
 * @param command {Command} CLI command
 * @param port Port number
 * @param debug Whether debug mode is enabled
 * @param inspectPort Port number for local dev server inspector
 */
const start = (command, port, debug, inspectPort) => {
	const wranglerPackageNumber = packageData.dependencies.wrangler;
	const wranglerVersion = `wrangler@${wranglerPackageNumber.replace(/^[\^~]/, '')}`;
	// Project wrangler.toml must be used to avoid issues w/ Wrangler. Ensure it is up to date.
	const wranglerTomlTemplate = join(__dirname, '..', 'wrangler.toml');
	const wranglerToml = join(process.cwd(), 'wrangler.toml');
	fs.cpSync(wranglerTomlTemplate, wranglerToml);
	const meshDir = '.mesh';
	const secrets = readSecretsFile(meshDir);
	const entrypoint = join(__dirname, 'worker.js');

	const commandArgs = [
		wranglerVersion,
		'--config',
		wranglerToml,
		'--cwd',
		process.cwd(),
		'dev',
		entrypoint,
		'--show-interactive-dev-session',
		'false',
		'--var',
		`SECRETS:${JSON.stringify(secrets)}`,
		'--port',
		port,
		'--inspector-port',
		debug ? inspectPort : 0,
	];

	const wrangler = spawn('npx', commandArgs, {
		stdio: 'inherit',
	});

	wrangler.on('close', code => {
		// eslint-disable-next-line no-console
		console.log(`wrangler dev process exited with code ${code}`);
	});

	wrangler.on('error', error => {
		// eslint-disable-next-line no-console
		console.error(`Failed to start wrangler dev: ${error.message}`);
	});
};

module.exports = { start };
