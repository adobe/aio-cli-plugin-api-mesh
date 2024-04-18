const { Command } = require('@oclif/core');
const chalk = require('chalk');

const logger = require('../../classes/logger');
const { initRequestId, initSdk } = require('../../helpers');
const {
	getMeshId,
	getMesh,
	getTenantFeatures,
	getMeshDeployments,
} = require('../../lib/devConsole');
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

		const { imsOrgId, imsOrgCode, projectId, workspaceId, workspaceName } = await initSdk({
			ignoreCache,
		});

		let meshId = null;

		try {
			meshId = await getMeshId(imsOrgId, projectId, workspaceId, workspaceName);
		} catch (err) {
			this.log(err.message);
			this.error(
				`Unable to get mesh ID. Please check the details and try again. RequestId: ${global.requestId}`,
			);
		}

		if (meshId) {
			try {
				const { showCloudflareURL: showEdgeMeshUrl } = await getTenantFeatures(imsOrgCode);
				const mesh = await getMesh(imsOrgId, projectId, workspaceId, workspaceName, meshId);
				this.log(
					'******************************************************************************************************',
				);
				switch (mesh.meshStatus) {
					case 'success':
						this.log(
							`${chalk.bold(`Legacy Mesh:`)} ${chalk.blackBright(`has been successfully built.`)}`,
						);
						break;
					case 'pending':
						this.log(
							`${chalk.bold(`Legacy Mesh:`)} ${chalk.blackBright(`is awaiting processing.`)}`,
						);
						break;
					case 'building':
						this.log(
							`${chalk.bold(`Legacy Mesh:`)} ${chalk.blackBright(
								`is currently being provisioned. Please wait a few minutes before checking again.`,
							)}`,
						);
						break;
					case 'error':
						this.log(`${chalk.bold(`Legacy Mesh:`)} ${chalk.blackBright(`Build has errors.`)}`);
						this.log(`${chalk.blackBright(mesh.error)}`);
						break;
				}
				if (showEdgeMeshUrl) {
					if (mesh.meshStatus == 'error') {
						this.log(`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(`Build has errors`)}`);
						this.log(`${chalk.blackBright(mesh.error)}`);
					} else {
						const meshDeployments = await getMeshDeployments(
							imsOrgCode,
							projectId,
							workspaceId,
							meshId,
						);
						switch (String(meshDeployments.status).toLowerCase()) {
							case 'success':
								this.log(
									`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(
										`has been successfully built.`,
									)}`,
								);
								break;
							case 'provisioning':
								this.log(
									`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(
										`is currently being provisioned. Please wait a few minutes before checking again.`,
									)}`,
								);
								break;
							case 'de-provisioning':
								this.log(
									`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(
										`is currently being de-provisioned. Please wait a few minutes before checking again.`,
									)}`,
								);
								break;
							case 'error':
								if (meshDeployments.error.includes(`Mesh status is not available`))
									this.log(
										`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(meshDeployments.error)}`,
									);
								else {
									this.log(`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(`build has errors.`)}`);
									this.log(`${chalk.blackBright(meshDeployments.error)}`);
								}
								break;
							default:
								this.log(
									`${chalk.bold(`Edge Mesh:`)} ${chalk.blackBright(
										`Mesh status is not available. Please wait for a while and try again.`,
									)}`,
								);
						}
					}
				}
				this.log(
					'******************************************************************************************************',
				);
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
