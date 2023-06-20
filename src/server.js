const fastify = require('fastify');
const { createYoga } = require('graphql-yoga');

const getCORSOptions = () => {
	try {
		const currentWorkingDirectory = process.cwd();
		const meshConfigPath = `${currentWorkingDirectory}/mesh-artifact/.meshrc.json`;

		const meshConfig = require(meshConfigPath);
		const { responseConfig } = meshConfig;
		const { CORS } = responseConfig;

		return CORS;
	} catch (e) {
		return {};
	}
};

const getYogaServer = async () => {
	const currentWorkingDirectory = process.cwd();
	const meshArtifactsPath = `${currentWorkingDirectory}/mesh-artifact`;

	const meshArtifacts = require(meshArtifactsPath);
	const { getBuiltMesh } = meshArtifacts;

	const tenantMesh = await getBuiltMesh();
	const corsOptions = getCORSOptions();

	const yogaServer = createYoga({
		plugins: tenantMesh.plugins,
		graphqlEndpoint: `/graphql`,
		graphiql: false,
		cors: corsOptions,
	});

	return yogaServer;
};

const app = fastify();

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.route({
	method: ['GET', 'POST'],
	url: '/graphql',
	handler: async (req, res) => {
		const yogaServer = await getYogaServer();

		console.log('Request received: ', req.body);

		const response = await yogaServer.handleNodeRequest(req, {
			req,
			reply: res,
		});

		response.headers.forEach((value, key) => {
			res.header(key, value);
		});

		res.status(response.status);

		res.send(response.body);

		return res;
	},
});

app.listen(3000, () => {
	console.log('Server is running on http://localhost:3000/graphql');
});
