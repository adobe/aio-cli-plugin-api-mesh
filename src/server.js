const fastify = require('fastify');
const { createYoga } = require('graphql-yoga');

let yogaServer = null;

// catch unhandled promise rejections
process.on('unhandledRejection', reason => {
	console.error('Unhandled Rejection at:', reason.stack || reason);
});

// catch uncaught exceptions
process.on('uncaughtException', err => {
	console.error('Uncaught Exception thrown');
	console.error(err.stack);
	process.exit(1);
});

// get meshId from command line arguments
const meshId = process.argv[2];

// get PORT number from command line arguments
const portNo = parseInt(process.argv[3]);

const getCORSOptions = () => {
	try {
		const currentWorkingDirectory = process.cwd();
		const meshConfigPath = `${currentWorkingDirectory}/mesh-artifact/${meshId}/.meshrc.json`;

		const meshConfig = require(meshConfigPath);
		const { responseConfig } = meshConfig;
		const { CORS } = responseConfig;

		return CORS;
	} catch (e) {
		return {};
	}
};

const getYogaServer = async () => {
	if (yogaServer) {
		return yogaServer;
	} else {
		const currentWorkingDirectory = process.cwd();
		const meshArtifactsPath = `${currentWorkingDirectory}/mesh-artifact/${meshId}`;

		const meshArtifacts = require(meshArtifactsPath);
		const { getBuiltMesh } = meshArtifacts;

		const tenantMesh = await getBuiltMesh();
		const corsOptions = getCORSOptions();

		console.log('Creating graphQL server');

		yogaServer = createYoga({
			plugins: tenantMesh.plugins,
			graphqlEndpoint: `/graphql`,
			graphiql: false,
			cors: corsOptions,
		});

		return yogaServer;
	}
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

app.listen(
	{
		//set the port no of the server based on the input value
		port: portNo
	},
	err => {
		if (err) {
			console.error(err);
			process.exit(1);
		}

		console.log(`Server is running on http://localhost:${portNo}/graphql`);
	},
);
