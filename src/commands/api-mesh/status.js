const { Command } = require('@oclif/core');
const logger = require('../../classes/logger');
const { initRequestId, initSdk } = require('../../helpers');
const { getMeshId, getMesh } = require('../../lib/devConsole');
const { ignoreCacheFlag } = require('../../utils');

require('dotenv').config();

class StatusCommand extends Command {
	static flags = {
		ignoreCache: ignoreCacheFlag,
	};

	async run() {
		await initRequestId();
		logger.info(`RequestId: ${global.requestId}`);

		const { flags } = await this.parse(StatusCommand);
		const ignoreCache = await flags.ignoreCache;

		const { imsOrgId, projectId, workspaceId } = await initSdk({
			ignoreCache,
		});

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId);
		} catch (err) {
			this.log(err.message);
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		if (meshId) {
			try {
				const mesh = await getMesh(imsOrgId, projectId, workspaceId, meshId);
				switch (mesh.meshStatus) {
					case 'success':
						this.log(
							'******************************************************************************************************',
						);
						this.log('Your mesh has been successfully built.');
						this.log(
							'******************************************************************************************************',
						);
						break;
					case 'pending':
						this.log(
							'******************************************************************************************************',
						);
						this.log('Your mesh is awaiting processing.');
						this.log(
							'******************************************************************************************************',
						);
						break;
					case 'building':
						this.log(
							'******************************************************************************************************',
						);
						this.log(
							'Your mesh is currently being provisioned. Please wait a few minutes before checking again.',
						);
						this.log(
							'******************************************************************************************************',
						);
						break;
					case 'error':
						this.log(
							'******************************************************************************************************',
						);
						this.log('Your mesh errored out with the following error. ', mesh.error);
						this.log(
							'******************************************************************************************************',
						);
						break;
				}
			} catch (err) {
				this.log(err.message);

				this.error(
					`Unable to get the mesh status. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
			}
		} else {
			this.error(
				`Unable to get mesh status. No mesh found for Org(${imsOrgId}) -> Project(${projectId}) -> Workspace(${workspaceId}). Please check the details and try again.`,
			);
		}
	}
}

StatusCommand.description = 'Get a mesh status with a given meshid.';

module.exports = StatusCommand;
