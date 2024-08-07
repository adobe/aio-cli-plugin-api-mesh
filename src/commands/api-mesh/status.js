const { Command } = require('@oclif/core');
const chalk = require('chalk');

const logger = require('../../classes/logger');
const { initRequestId, initSdk, createNotice } = require('../../helpers');
const { getMeshId, getMesh, getMeshDeployments } = require('../../lib/devConsole');
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
				const mesh = await getMesh(imsOrgId, projectId, workspaceId, workspaceName, meshId);
				
				// this.log(
				// 	await createNotice(
				// 		`API Mesh now runs at the edge and legacy mesh URLs will be deprecated.\nUse the following link to find more information on how to migrate your mesh:\n${chalk.underline.blue(
				// 			'https://developer.adobe.com/graphql-mesh-gateway/mesh/release/migration',
				// 		)}`,
				// 	),
				// );

				this.log(
					chalk.bgYellow(
						`\nAPI Mesh now runs at the edge and legacy mesh URLs will be deprecated.\nUse the following link to find more information on how to migrate your mesh:`,
					),
				);
				this.log(
					chalk.underline.blue(
						'https://developer.adobe.com/graphql-mesh-gateway/mesh/release/migration\n',
					),
				);
				const meshLabel = chalk.bold(`Legacy Mesh:`);

				this.log(''.padEnd(102, '*'));
				this.displayMeshStatus(mesh, meshLabel);
				await this.displayEdgeMeshStatus(mesh, imsOrgCode, projectId, workspaceId);
				this.log(''.padEnd(102, '*'));
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

	/**
	 * Display the status of the mesh.
	 *
	 * @param mesh - Mesh data
	 * @param meshLabel - Label to display for the mesh based on the mesh type
	 */
	displayMeshStatus(mesh, meshLabel = 'Your mesh') {
		switch (mesh.meshStatus) {
			case 'success':
				this.log(`${meshLabel} has been successfully built.`);
				break;
			case 'pending':
				this.log(`${meshLabel} is awaiting processing.`);
				break;
			case 'building':
				this.log(
					`${meshLabel} is currently being provisioned. Please wait a few minutes before checking again.`,
				);
				break;
			case 'error':
				this.log(
					meshLabel === 'Your mesh'
						? `${meshLabel} errored out with the following error.`
						: `${meshLabel} build has errors.`,
				);
				this.log(mesh.error);
				break;
		}
	}

	/**
	 * Display the status of the edge mesh.
	 *
	 * While the mesh is not successfully built, the edge mesh status will match the legacy mesh status.
	 * Once the build is successful, the edge mesh status will reflect the deployment status
	 * @param mesh
	 * @param imsOrgCode
	 * @param projectId
	 * @param workspaceId
	 * @returns {Promise<void>}
	 */
	async displayEdgeMeshStatus(mesh, imsOrgCode, projectId, workspaceId) {
		const edgeMeshLabel = chalk.bold(`Edge Mesh:`);
		const buildStatus = mesh.meshStatus;

		if (buildStatus !== 'success') {
			this.displayMeshStatus(mesh, edgeMeshLabel);
		} else {
			const meshDeployments = await getMeshDeployments(
				imsOrgCode,
				projectId,
				workspaceId,
				mesh.meshId,
			);

			const edgeDeploymentStatus = String(meshDeployments.status).toLowerCase();

			switch (edgeDeploymentStatus) {
				case 'success':
					this.log(`${edgeMeshLabel} has been successfully built.`);
					break;
				case 'provisioning':
					this.log(
						`${edgeMeshLabel} is currently being provisioned. Please wait a few minutes before checking again.`,
					);
					break;
				case 'de-provisioning':
					this.log(
						`${edgeMeshLabel} is currently being de-provisioned. Please wait a few minutes before checking again.`,
					);
					break;
				case 'error':
					this.log(`${edgeMeshLabel} ${meshDeployments.error}`);
					break;
				default:
					this.log(
						`${edgeMeshLabel} status is not available. Please wait for a while and try again.`,
					);
			}
		}
	}
}

StatusCommand.description = 'Get a mesh status with a given meshid.';

module.exports = StatusCommand;
