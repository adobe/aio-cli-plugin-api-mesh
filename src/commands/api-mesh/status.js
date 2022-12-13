const { Command } = require('@oclif/core');
const logger = require('../../classes/logger');
const { initRequestId, initSdk } = require('../../helpers');
const { getMeshId } = require('../../lib/devConsole');
const { getMeshStatus } = require('../../lib/sms');
const { ignoreCacheFlag } = require('../../utils');

require('dotenv').config();

class StatusCommand extends Command {
    static flags = {
        ignoreCache: ignoreCacheFlag,
    };

    async run() {
        await initRequestId();
		logger.info(`RequestId: ${global.requestId}`);

		const { args, flags } = await this.parse(StatusCommand);
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
                const mesh = await getMeshStatus(meshId, imsOrgId, projectId, workspaceId);
                switch (mesh.meshStatus) {
                    case 'success':
                        this.log('Your mesh has been successfully built.');
                        break;
                    case 'pending':
                    case 'building':
                        this.log('Your mesh is currently being processed. Please wait upto 5 minutes before checking the status.');
                        break;
                    case 'error':
                        this.log('Your mesh errored out with the following error. ', mesh.error);
                        break;
                }
            } catch (err) {
                this.log(err.message);

				this.error(
					`Unable to get the mesh status. If the error persists please contact support. RequestId: ${global.requestId}`,
				);
            }
        }
    }
}

StatusCommand.description = 'Get a mesh status with a given meshid.';

module.exports = StatusCommand;
