/* eslint-disable no-undef */
import http from 'k6/http';

if (
	__ENV.MESH_ENDPOINT === undefined ||
	__ENV.MESH_ENDPOINT === null ||
	__ENV.MESH_ENDPOINT === ''
) {
	throw new Error('MESH_ENDPOINT is required, please add it the test:perf script in package.json');
} else if (typeof __ENV.MESH_ENDPOINT !== 'string') {
	throw new Error('MESH_ENDPOINT must be a string');
} else if (!__ENV.MESH_ENDPOINT.startsWith('https')) {
	throw new Error('MESH_ENDPOINT must start with https');
} else {
	console.log(`Starting Performance Tests against MESH_ENDPOINT: ${__ENV.MESH_ENDPOINT}`);
}

export default function () {
	http.get(`${__ENV.MESH_ENDPOINT}?query={__schema{queryType{name}}}`, {
		headers: {
			'Content-Type': 'application/json',
			'Connection': 'keep-alive',
		},
	});
}
