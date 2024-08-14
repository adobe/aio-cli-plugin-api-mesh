const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Define the Fastify endpoint URL with the filename as a query parameter
const filename = 'bulk_logs.csv'; // Example filename provided by the client
// const url = `https://your-fastify-server.com/v2/organizations/orgCode/projects/projId/workspaces/workspaceId/meshes/meshId/logs?filename=${encodeURIComponent(filename)}&startTime=2023-01-01T00:00:00Z&endTime=2023-01-02T00:00:00Z`;
const url =
	'http://127.0.0.1:8080/v2/organizations/612C2F3061FAE7720A494230@AdobeOrg/projects/test-project/workspaces/tpw5/meshes/f0ec3633-7377-4533-8788-484d2b65f4bc/logs?startTime=20240805T095044&endTime=20240805T225647';
// Define the output file path in the current working directory
const outputPath = path.join(process.cwd(), filename);

// Make the HTTP request using axios and handle the response as a stream
axios({
	method: 'get',
	url: url,
	responseType: 'stream', // Important: ensures the response is treated as a stream
})
	.then(response => {
		// Create write stream to the specified output file
		const fileStream = fs.createWriteStream(outputPath);

		// Pipe the response data stream into the file stream
		response.data.pipe(fileStream);

		fileStream.on('finish', () => {
			console.log('Logs have been successfully downloaded and saved to', outputPath);
		});

		// Handle any errors that occur during the file writing process
		fileStream.on('error', error => {
			console.error('Error writing to file:', error);
		});
	})
	.catch(error => {
		console.error('Error with the request:', error.message);
	});
