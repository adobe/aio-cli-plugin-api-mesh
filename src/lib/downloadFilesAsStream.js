const axios = require('axios');
const fs = require('fs');
const { down } = require('inquirer/lib/utils/readline');
const path = require('path');
const logger = require('../classes/logger');
const { objToString } = require('../helpers');


// Function to download a file using a presigned URL and return its stream
const downloadFile = async (url) => {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream' // Changed to stream to handle large files efficiently
    });
  
    return response.data;
  };

  // Function to download presigned URLs and save them to the output directory
const downloadFilesSequentially = async (logFilepath) => {
	try {
	  // Fetch the array of presigned URL objects from the endpoint	  
	  //const response = await axios.get(endpoint);
	  const response = await axios.get('http://127.0.0.1:8080/health');
	  if(response?.status === 200)	{
		console.log(`Presigned urls objects in string format: ${objToString(response, ['data'])}` );
	  }
	  const presignedUrls = response.data;	  
	  console.log(`Presigned URLs fetched successfully: ${presignedUrls.length} URLs found.`);
      // Open a writable stream for the output file
      const writer = fs.createWriteStream(logFilepath, { flags: 'a' });
  
	  for (const urlObj of presignedUrls) {
		const { Key, url } = urlObj;
		console.log(`Key: ${Key} and Url: ${url}`);		
		
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

  //const endpoint = 'http://127.0.0.1:8080';
  const downloadDir = '/Users/dthampy/Downloads';
  const logFilepath = path.join(__dirname, 'logfiles.json');

downloadFilesSequentially(logFilepath);

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


//downloadFilesSequentially(presignedUrls, '/Users/dthampy/Downloads');
//downloadFilesSequentially(endpoint, downloadDir);

 const presignedUrls = [
	{ Key: 'file1.json', Url: 'https://s3.us-east-1.amazonaws.com/s3-trigger-lambda-dt/FirstonethousandLines.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAX6ZD4OOAXDF73MHX%2F20240802%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240802T140944Z&X-Amz-Expires=3600&X-Amz-Security-Token=FwoGZXIvYXdzELf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDBBk%2FUWwQNfk287hbSLqAa6oE2QhZ%2B29PH77geXODzl47hGBJORVmrRsOrxaCPdOls2KvX%2BxcjnBa4wVykTIws2gi6gVOR3JqrFwLENWGR2pzHpnbSw4%2FeaoH7T93lL4ibdmbRSRTJQF2BJGa7bqHi0BK9zW1UjmHWi2M%2FoMby53WUS1AfYSQh0paGHccQgXasn6RD1bvIpEDeA5UNkuC4UDJIdh6Cba8lk0pLkoWVWie2niiwPgeywX0MiJt9Gt6tPRNjiwCSiqxN8kiqHzkARFD2aJFxYy1lB5JtZsCMZ6zIKxbsn09YAUrpbkEMplu0ci9k2W%2BvH%2F%2BijTybO1BjItZdCB%2B4CmdDsI4zX4dOah9WG08R9bVbkeyJo5nSbRyGR2eVlCZstM95GRnbMQ&X-Amz-Signature=e504e2466bc841eaab22e01c406208c3aebcfc7cab5e6adf3e55c3a139e5194a&X-Amz-SignedHeaders=host&x-id=GetObject' },
	{ Key: 'file2.json', Url: 'https://s3.us-east-1.amazonaws.com/s3-trigger-lambda-dt/large_file.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAX6ZD4OOAXDF73MHX%2F20240802%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240802T140944Z&X-Amz-Expires=3600&X-Amz-Security-Token=FwoGZXIvYXdzELf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDBBk%2FUWwQNfk287hbSLqAa6oE2QhZ%2B29PH77geXODzl47hGBJORVmrRsOrxaCPdOls2KvX%2BxcjnBa4wVykTIws2gi6gVOR3JqrFwLENWGR2pzHpnbSw4%2FeaoH7T93lL4ibdmbRSRTJQF2BJGa7bqHi0BK9zW1UjmHWi2M%2FoMby53WUS1AfYSQh0paGHccQgXasn6RD1bvIpEDeA5UNkuC4UDJIdh6Cba8lk0pLkoWVWie2niiwPgeywX0MiJt9Gt6tPRNjiwCSiqxN8kiqHzkARFD2aJFxYy1lB5JtZsCMZ6zIKxbsn09YAUrpbkEMplu0ci9k2W%2BvH%2F%2BijTybO1BjItZdCB%2B4CmdDsI4zX4dOah9WG08R9bVbkeyJo5nSbRyGR2eVlCZstM95GRnbMQ&X-Amz-Signature=ffd2fe51a12a3c4bcfea6ba2343faee4fc4e5956ec688c850f9de2b2fb5d1083&X-Amz-SignedHeaders=host&x-id=GetObject' },
	{Key: 'file3.json', Url: 'https://s3.us-east-1.amazonaws.com/s3-trigger-lambda-dt/logs.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAX6ZD4OOAXDF73MHX%2F20240802%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240802T140944Z&X-Amz-Expires=3600&X-Amz-Security-Token=FwoGZXIvYXdzELf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDBBk%2FUWwQNfk287hbSLqAa6oE2QhZ%2B29PH77geXODzl47hGBJORVmrRsOrxaCPdOls2KvX%2BxcjnBa4wVykTIws2gi6gVOR3JqrFwLENWGR2pzHpnbSw4%2FeaoH7T93lL4ibdmbRSRTJQF2BJGa7bqHi0BK9zW1UjmHWi2M%2FoMby53WUS1AfYSQh0paGHccQgXasn6RD1bvIpEDeA5UNkuC4UDJIdh6Cba8lk0pLkoWVWie2niiwPgeywX0MiJt9Gt6tPRNjiwCSiqxN8kiqHzkARFD2aJFxYy1lB5JtZsCMZ6zIKxbsn09YAUrpbkEMplu0ci9k2W%2BvH%2F%2BijTybO1BjItZdCB%2B4CmdDsI4zX4dOah9WG08R9bVbkeyJo5nSbRyGR2eVlCZstM95GRnbMQ&X-Amz-Signature=82ecbaf9dea6a9137ade7e1c83dc8a8847ddbce23e807e490e1c3e300e915b76&X-Amz-SignedHeaders=host&x-id=GetObject'},
	// Add more URLs as needed
  ];
 */