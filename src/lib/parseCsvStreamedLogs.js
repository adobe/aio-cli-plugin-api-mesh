const axios = require('axios');
const { parse } = require('fast-csv');
const fs = require('fs');

// Define the Fastify endpoint URL
// const url = 'https://your-fastify-server.com/path-to-your-logs';
// const url =
	'http://127.0.0.1:8080/v2/organizations/612C2F3061FAE7720A494230@AdobeOrg/projects/test-project/workspaces/tpw5/meshes/f0ec3633-7377-4533-8788-484d2b65f4bc/logs?startTime=20240805T095044&endTime=20240805T225647';
    const url =
	'http://127.0.0.1:8080/v2/organizations/612C2F3061FAE7720A494230@AdobeOrg/projects/test-project/workspaces/tpw5/meshes/f0ec3633-7377-4533-8788-484d2b65f4bc/logs?startTime=20240802T081230&endTime=20240809T144523';


// Regex patterns to match the desired columns
const timestampRegex = /^([^\t]+)/;  // Matches the first column (TimestampMs)
const logLevelRegex = /"[^"]*'Level':\s*'(\w+)'[^"]*"/;  // Matches 'Level' within the JSON-like string in the 3rd column
const rayIdRegex = /(?:[^\t]*\t){5}([^\t]+)/;  // Matches the 6th column (RayID)
const responseStatusRegex = /(?:[^\t]*\t){8}([^\t]+)/;  // Matches the 9th column (Response Status)

function extractValuesFromLine(line) {
    const timestampMatch = line.match(timestampRegex);
    const logLevelMatch = line.match(logLevelRegex);
    const rayIdMatch = line.match(rayIdRegex);
    const responseStatusMatch = line.match(responseStatusRegex);

    return {
        timestamp: timestampMatch ? timestampMatch[1] : null,
        logLevel: logLevelMatch ? logLevelMatch[1] : null,
        rayId: rayIdMatch ? rayIdMatch[1] : null,
        responseStatus: responseStatusMatch ? responseStatusMatch[1] : null,
    };
}

// Function to parse the CSV content and extract desired fields
/**
 * 
 * function parseCsvContent(csvContent) {
    const extractedData = [];
    const lines = csvContent.split('\n');

    lines.forEach(line => {
        const values = extractValuesFromLine(line);
        if (values.timestamp && values.rayId && values.responseStatus) {
            extractedData.push(values);
        }
    });

    return extractedData;
}

// Make the HTTP request using axios and handle the response as a stream
axios({
    method: 'get',
    url: url,
    responseType: 'stream',
})
    .then((response) => {
        let csvContent = '';

        response.data.on('data', (chunk) => {
            csvContent += chunk.toString();  // Accumulate the CSV content
        });

        response.data.on('end', () => {
            const extractedData = parseCsvContent(csvContent);
            extractedData.forEach(({ timestamp, logLevel, rayId, responseStatus }) => {
                console.log(`Timestamp: ${timestamp}, Log Level: ${logLevel}, RayID: ${rayId}, Response Status: ${responseStatus}`);
            });
        });

        response.data.on('error', (error) => {
            console.error('Error reading CSV stream:', error.message);
        });
    })
    .catch((error) => {
        console.error('Error with the request:', error.message);
    });
 */
// Make the HTTP request using axios and handle the response as a stream
axios({
    method: 'get',
    url: url,
    responseType: 'stream',
})
    .then((response) => {
        let partialLine = '';

        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            const lines = chunkStr.split('\n');

            // Process all lines except the last one, which may be incomplete
            lines.slice(0, -1).forEach(line => {
                const fullLine = partialLine + line;
                partialLine = '';  // Clear partialLine once the complete line is processed

                const values = extractValuesFromLine(fullLine);
                if (values.timestamp && values.rayId && values.responseStatus) {
                    console.log(`Timestamp: ${values.timestamp}, Log Level: ${values.logLevel}, RayID: ${values.rayId}, Response Status: ${values.responseStatus}`);
                }
            });

            // Save the last line as partial, it might be incomplete
            partialLine = lines[lines.length - 1];
        });

        response.data.on('end', () => {
            // Process any remaining partial line
            if (partialLine) {
                const values = extractValuesFromLine(partialLine);
                if (values.timestamp && values.rayId && values.responseStatus) {
                    console.log(`Timestamp: ${values.timestamp}, Log Level: ${values.logLevel}, RayID: ${values.rayId}, Response Status: ${values.responseStatus}`);
                }
            }
        });

        response.data.on('error', (error) => {
            console.error('Error reading CSV stream:', error.message);
        });
    })
    .catch((error) => {
        console.error('Error with the request:', error.message);
    });