const { spawn } = require('child_process');

const runServer = (meshId, portNo) => {
	const wranglerPath = `${__dirname}/../node_modules/.bin/wrangler`;
	const indexFilePath = `${__dirname}/index.js`;
	const commandArgs = ['dev', indexFilePath, '--var', `MESH_ID:${meshId}`, '--port', portNo];

	const wrangler = spawn(wranglerPath, commandArgs, {
		stdio: 'inherit',
	});

	wrangler.on('close', code => {
		console.log(`wrangler dev process exited with code ${code}`);
	});

	wrangler.on('error', error => {
		console.error(`Failed to start wrangler dev: ${error.message}`);
	});
};

module.exports = { runServer };
