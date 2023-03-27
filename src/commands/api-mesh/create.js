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
const { readFile } = require('fs/promises');

const { initSdk, initRequestId, promptConfirm } = require('../../helpers');
const logger = require('../../classes/logger');
const CONSTANTS = require('../../constants');
const { ignoreCacheFlag, autoConfirmActionFlag, jsonFlag, envFileFlag, clearEnv, lintEnvFileContent, loadPupa } = require('../../utils');
const {
	createMesh,
	createAPIMeshCredentials,
	subscribeCredentialToMeshService,
} = require('../../lib/devConsole');

const dotenv = require('dotenv');
const { type } = require('os');
//import { pupa } from 'pupa';

const { MULTITENANT_GRAPHQL_SERVER_BASE_URL } = CONSTANTS;

class CreateCommand extends Command {
	static args = [{ name: 'file'}];
	static flags = {
		ignoreCache: ignoreCacheFlag,
		autoConfirmAction: autoConfirmActionFlag,
		json: jsonFlag,
		env : envFileFlag
	};

	static enableJsonFlag = true;

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);
		
		const { args, flags } = await this.parse(CreateCommand);

		const ignoreCache = await flags.ignoreCache;
		const autoConfirmAction = await flags.autoConfirmAction;

		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

		if (!args.file) {
			this.error('Missing file path. Run aio api-mesh create --help for more info.');
		}
		
		let rawData;

		//Check the rawData from the input file
		try {
			rawData = await readFile(args.file, 'utf8')
		} catch (error) {
			logger.error(error);

			this.log(error.message);
			this.error(
				'Unable to read the mesh configuration file provided. Please check the file and try again.',
			);
		}

		let interpolatedMesh;
		
		//flags.env to be passed to envValidator
		if(flags.env){
			let envFileContent;

			//Read the environment file
			try{
				envFileContent = await readFile(flags.env, 'utf8');
			}
			catch(error){
				this.log(error.message)
				this.error('Unable to read the env file provided. Please check the file and try again.')
			}

			//Validate the env file
			const envFileValidity=lintEnvFileContent(envFileContent);
			if(envFileValidity.valid){
				//load env file into the process.env object
				clearEnv();

				//Added env at start of each environment variable
				let envObj={env:(dotenv.config({path:flags.env})).parsed};
				let missingKeys=[];
				
				//Interpolate the mesh input file with the data in the environment file
				await loadPupa().then(pupa => {
					interpolatedMesh = pupa(rawData, envObj, {
						ignoreMissing:true, 
						transform : ({value,key}) => {
							if (key.startsWith("env.")) {
							if (value) {
								return value;
							} else {
								// missing value, add to list
								missingKeys.push(key.split(".")[1]);
							}
							} else {
							//ignore
							return undefined;
							}
							return value;
					  }
					});
					
				  }).catch(err => {
					this.error('Failed to load pupa:', err);
				  });

				
				  if(missingKeys.length)
				  {
					  this.error("The mesh file cannot be interpolated due to missing keys : "+missingKeys.toString())
				  }
				  
			}
			else{
				this.error(`Issue in ${flags.env} file - `+envFileValidity.error)
			}
		}

		//Load the interpolated string in JSON format
		let data;
		
		try{
			data=JSON.parse(interpolatedMesh);
		}
		catch(err){
			this.log(err.message);
			this.log(interpolatedMesh);
			this.error("Interpolated mesh is not a valid JSON. Please check the generated json file.")
		}

		let shouldContinue = true;

		if (!autoConfirmAction) {
			shouldContinue = await promptConfirm(`Are you sure you want to create a mesh?`);
		}

		if (shouldContinue) {
			try {
				const mesh = await createMesh(imsOrgId, projectId, workspaceId, data);
				let sdkList = [];

				if (mesh) {
					this.log(
						'******************************************************************************************************',
					);
					this.log(
						'Your mesh is being provisioned. Wait a few minutes before checking the status of your mesh %s',
						mesh.meshId,
					);
					this.log('To check the status of your mesh, run:');
					this.log('aio api-mesh:status');
					this.log(
						'******************************************************************************************************',
					);

					// create API key credential
					const adobeIdIntegrationsForWorkspace = await createAPIMeshCredentials(
						imsOrgId,
						projectId,
						workspaceId,
					);

					if (adobeIdIntegrationsForWorkspace) {
						this.log('Successfully created API Key %s', adobeIdIntegrationsForWorkspace.apiKey);
						// subscribe the credential to API mesh service
						sdkList = await subscribeCredentialToMeshService(
							imsOrgId,
							projectId,
							workspaceId,
							adobeIdIntegrationsForWorkspace.id,
						);

						if (sdkList) {
							this.log(
								'Successfully subscribed API Key %s to API Mesh service',
								adobeIdIntegrationsForWorkspace.apiKey,
							);

							this.log(
								'Mesh Endpoint: %s\n',
								`${MULTITENANT_GRAPHQL_SERVER_BASE_URL}/${mesh.meshId}/graphql?api_key=${adobeIdIntegrationsForWorkspace.apiKey}`,
							);
						} else {
							this.log(
								'Unable to subscribe API Key %s to API Mesh service',
								adobeIdIntegrationsForWorkspace.apiKey,
							);
						}
					} else {
						this.log('Unable to create API Key');
					}
					// Do not remove or rename return values.
					// Template adobe/generator-app-api-mesh relies on "mesh" & "adobeIdIntegrationsForWorkspace" obj structure
					return {
						adobeIdIntegrationsForWorkspace,
						sdkList,
						mesh,
					};
				} else {
					this.error(`Unable to create a mesh. Please try again. RequestId: ${global.requestId}`, {
						exit: false,
					});
				}
			} catch (error) {
				this.log(error.message);

				this.error(
					`Unable to create a mesh. Please check the mesh configuration file and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.log('Create cancelled');

			return 'Create cancelled';
		}
	}
}

CreateCommand.description = 'Create a mesh with the given config.';

module.exports = CreateCommand;
