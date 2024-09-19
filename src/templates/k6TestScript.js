/* eslint-disable no-undef */
import http from 'k6/http';

export default function () {
	http.get(`${__ENV.MESH_ENDPOINT}?query={__schema{queryType{name}}}`, {
		headers: {
			'Content-Type': 'application/json',
			'Connection': 'keep-alive',
		},
	});
}
