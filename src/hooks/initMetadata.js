const { initMetadata, initRequestId } = require('../helpers');

const hook = async function () {
	initRequestId();
	initMetadata(this.config);
};

module.exports = hook;
