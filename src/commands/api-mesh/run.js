/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { Command } = require('@oclif/core');
const fastify = require('fastify');
const { createYoga } = require('graphql-yoga');

const logger = require('../../classes/logger');
const { initRequestId } = require('../../helpers');

require('dotenv').config();

function startGraphqlServer() {
	const getCORSOptions = () => {
		try {
			const meshConfig = require(`../../../mesh-artifact/.meshrc.json`);
			const { responseConfig } = meshConfig;
			const { CORS } = responseConfig;

			return CORS;
		} catch (e) {
			return {};
		}
	};

	const getYogaServer = async () => {
		const meshArtifacts = require(`../../../mesh-artifact`);
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
}

class RunCommand extends Command {
	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		startGraphqlServer();
	}
}

RunCommand.description = 'Run mesh config';

module.exports = RunCommand;
