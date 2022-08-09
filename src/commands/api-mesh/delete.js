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

const { Command } = require('@oclif/command');

const logger = require('../../classes/logger');
const { initSdk, initRequestId, promptConfirm } = require('../../helpers');

require('dotenv').config();

class DeleteCommand extends Command {
	static args = [{ name: 'meshId' }];

	async run() {
		await initRequestId();

		logger.info(`RequestId: ${global.requestId}`);

		const { args } = this.parse(DeleteCommand);

		if (!args.meshId) {
			this.error('Missing Mesh ID. Run aio api-mesh delete --help for more info.');

			return;
		}

		const { schemaServiceClient, imsOrgId, projectId, workspaceId } = await initSdk();

		const shouldContinue = await promptConfirm(
			`Are you sure you want to delete the mesh: ${args.meshId}?`,
		);

		if (shouldContinue) {
			try {
				const deleteMeshResponse = await schemaServiceClient.deleteMesh(
					imsOrgId,
					projectId,
					workspaceId,
					args.meshId,
				);

				if (deleteMeshResponse) {
					this.log('Successfully deleted mesh %s', args.meshId);

					const credential = await schemaServiceClient.getApiKeyCredential(
						imsOrgId,
						projectId,
						workspaceId,
					);

					if (credential) {
						const newSDKList = await schemaServiceClient.unsubscribeCredentialFromMeshService(
							imsOrgId,
							projectId,
							workspaceId,
							credential.id_integration,
						);

						if (newSDKList) {
							this.log('Successfully unsubscribed API Key %s', credential.client_id);
						} else {
							this.log('Unable to unsubscribe API Key %s', credential.client_id);
						}
					} else {
						this.log('No API Key found to unsubscribe');
					}

					return deleteMeshResponse;
				} else {
					throw new Error('Unable to delete mesh');
				}
			} catch (error) {
				this.log(error.message);

				this.error(
					`Unable to delete mesh. Please check the details and try again. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.log('Delete cancelled');

			return 'Delete cancelled';
		}
	}
}

DeleteCommand.description = 'Delete the config of a given mesh';

module.exports = DeleteCommand;
