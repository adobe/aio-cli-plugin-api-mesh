const axios = require('axios');
const fs = require('fs');
const { down } = require('inquirer/lib/utils/readline');
const path = require('path');
const logger = require('../classes/logger');
const { objToString } = require('../helpers');

const downloadFile = async (url, outputPath) => {
	console.log(`Downloading ${url} to ${outputPath}...`);
	const writer = fs.createWriteStream(outputPath);

	const response = await axios({
		url,
		method: 'GET',
		responseType: 'stream',
	});

	response.data.pipe(writer);

	return new Promise((resolve, reject) => {
		writer.on('finish', resolve);
		writer.on('error', reject);
	});
};

// Function to download presigned URLs and save them to the output directory
const downloadFilesSequentially = async outputDir => {
	try {
		// Fetch the array of presigned URLs from the endpoint
		//console.log(`check if health endpoint works from ${endpoint}...`);
		//const response = await axios.get(endpoint);
		const response = await axios.get('http://127.0.0.1:8080/health');
		if (response?.status === 200) {
			console.log(`Presigned urls objects in string format: ${objToString(response, ['data'])}`);
			const presignedUrls = response.data;
			console.log(`Presigned urls: ${response.data}`);
			console.log(`Presigned URLs fetched successfully: ${presignedUrls.length} URLs found.`);

			for (const urlObj of presignedUrls) {
				const { Key, url } = urlObj;
				console.log(`Key: ${Key}`);
				console.log(`Url: ${url}`);
				// Replace slashes for valid file names
				const outputPath = path.join(outputDir, Key.replace(/\//g, '_'));
				console.log(`Downloading ${Key}...`);
				try {
					await downloadFile(url, outputPath);
					console.log(`${Key} downloaded successfully.`);
				} catch (error) {
					console.error(`Error downloading ${Key}:`, error);
				}
			}
		} else {
			console.log('Error getting presigned URLs from SMS:', response);
		}
	} catch (error) {
		console.error('Error fetching presigned URLs:', error);
	}
};

//const endpoint = 'http://127.0.0.1:8080';
const downloadDir = '/Users/dthampy/Downloads';

downloadFilesSequentially(downloadDir);

/**
 * const downloadFilesSequentially = async (urls, outputDir) => {
	for (const urlObj of urls) {
	  const { Key, Url } = urlObj;
	  const outputPath = path.join(outputDir, Key.replace(/\//g, '_')); // Replace slashes for valid file names
	  console.log(`Downloading ${Key}...`);
	  try {
		await downloadFile(Url, outputPath);
		console.log(`${Key} downloaded successfully.`);
	  } catch (error) {
		console.error(`Error downloading ${Key}:`, error);
	  }
	}
  };

 */

// Function to download presigned URLs and append them to a single output file
const downloadFilesSequentially2 = async (endpoint, outputFilePath) => {
	try {
		// Fetch the array of presigned URLs from the endpoint
		const response = await axios.get(endpoint);
		const presignedUrls = response.data;

		// Open a writable stream for the output file
		const writer = fs.createWriteStream(outputFilePath, { flags: 'a' });

		for (const urlObj of presignedUrls) {
			const { Key, url } = urlObj;
			console.log(`Downloading ${Key}...`);
			try {
				const fileStream = await downloadFile(url);
				await new Promise((resolve, reject) => {
					fileStream.pipe(writer, { end: false });
					fileStream.on('end', resolve);
					fileStream.on('error', reject);
				});
				console.log(`${Key} downloaded and appended successfully.`);
			} catch (error) {
				console.error(`Error downloading ${Key}:`, error);
			}
		}

		// Close the writable stream
		writer.end();
	} catch (error) {
		console.error('Error fetching presigned URLs:', error);
	}
};
