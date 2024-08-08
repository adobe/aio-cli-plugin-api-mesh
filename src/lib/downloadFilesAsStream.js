const axios = require('axios');
const fs = require('fs');
const { down } = require('inquirer/lib/utils/readline');
const path = require('path');
const logger = require('../classes/logger');
const { objToString } = require('../helpers');

// Function to download a file using a presigned URL and consume it as stream
const downloadFile = async url => {
	const response = await axios({
		url,
		method: 'GET',
		responseType: 'stream', // Changed to stream from arraybuffer to handle large files
	});

	return response.data;
};

// Function to download presigned URLs and save them to the specified directory
const downloadFilesSequentially = async logFilepath => {
	try {
		// Fetch the array of presigned URL objects from the endpoint
		//const response = await axios.get(endpoint);
		const response = await axios.get('http://127.0.0.1:8080/health');
		if (response?.status === 200) {
			//console.log(`Presigned urls objects in string format: ${objToString(response, ['data'])}` );
			const presignedUrls = response.data;
			console.log(`Presigned URLs fetched successfully: ${presignedUrls.length} URLs found.`);
			// Open a writable stream for the output file
			const writer = fs.createWriteStream(logFilepath, { flags: 'a' });

			for (const urlObj of presignedUrls) {
				const { Key, url } = urlObj;
				//  console.log(`Key: ${Key} and Url: ${url}`);

				console.log(`Downloading ${Key}...`);
				try {
					const fileStream = await downloadFile(url);
					await new Promise((resolve, reject) => {
						fileStream.pipe(writer, { end: false });
						fileStream.on('end', resolve);
						fileStream.on('error', reject);
					});
					console.log(`${Key} downloaded and appended successfully to ${logFilepath}.`);
				} catch (error) {
					console.error(`Error downloading ${Key}:`, error);
				}
			}
			// Close the writable stream
			writer.end();
		} else {
			console.log(`Error fetching presigned URLs (sms): ${response?.status}`);
		}
	} catch (error) {
		console.error('Error fetching presigned URLs:', error);
	}
};

//const endpoint = 'http://127.0.0.1:8080';
const downloadDir = '/Users/dthampy/Downloads';
const logFilepath = path.join(__dirname, 'logfiles.json');

downloadFilesSequentially(logFilepath);
