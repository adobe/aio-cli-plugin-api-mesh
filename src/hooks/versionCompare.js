const { getPluginVersionDetails, isCurrentVersionLatest } = require('../helpers');
const chalk = require('chalk');

const hook = async function () {
	const installedPlugins = this.config.plugins;

	const { currentVersion, latestVersion } = await getPluginVersionDetails(installedPlugins);

	if (!isCurrentVersionLatest(currentVersion, latestVersion)) {
		this.warn(
			`@adobe/aio-cli-plugin-api-mesh update available from ${chalk.yellowBright(
				currentVersion,
			)} to ${chalk.yellowBright(latestVersion)}`,
		);
		this.warn(
			`Run ${chalk.greenBright(
				'aio plugins:install @adobe/aio-cli-plugin-api-mesh',
			)} to update to the latest`,
		);
	}
};

module.exports = hook;
