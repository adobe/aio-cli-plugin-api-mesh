const { v4: uuidv4 } = require('uuid');

/**
 * Class representing a UUID object which is used as a param across the application
 */
class UUID {
    constructor(str) {
        this.m_str = str || UUID.newUuid().toString();
    }

    toString() {
        return this.m_str;
    }

    static newUuid() {
        const uuid = uuidv4();
        return new UUID(uuid);
    }
}

module.exports = UUID;
