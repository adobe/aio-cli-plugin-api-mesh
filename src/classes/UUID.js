const { v4: uuidv4 } = require('uuid');
//Class representing a new unique UUID which is used for request-id tracing
class UUID {
	constructor(uuid = '') {
		this.uuid = uuid;
	}

	toString() {
		return this.uuid;
	}

	static newUuid() {
		const newUUID = uuidv4();
		return new UUID(newUUID);
	}
}

module.exports = {
	UUID,
};
