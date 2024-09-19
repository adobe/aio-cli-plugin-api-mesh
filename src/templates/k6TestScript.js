import http from 'k6/http';

export default function () {
	http.get(
		'https://edge-sandbox-graph.adobe.io/api/3d995241-3497-43da-acf6-6f5045bc0eca/graphql?query={__schema{queryType{name}}}',
		{
			headers: {
				'Content-Type': 'application/json',
				'Connection': 'keep-alive',
			},
		},
	);
}
