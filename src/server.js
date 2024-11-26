const { exec } = require('child_process');

const runServer = () => {
	const serverPath = `${__dirname}/index.js`;

	const command = `${__dirname}/../node_modules/.bin/wrangler dev ${serverPath} --var MESH_ID:00000000-0000-0000-0000-000000000000`;
	const server = exec(command);

	server.stdout.on('data', data => {
		console.log(data);
	});

	server.stderr.on('data', data => {
		console.error(data);
	});

	server.on('close', code => {
		console.log(`Server closed with code ${code}`);
	});

	server.on('exit', code => {
		console.log(`Server exited with code ${code}`);
	});

	server.on('error', err => {
		console.error(`Server exited with error ${err}`);
	});
};

module.exports = { runServer };
