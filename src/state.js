import { GraphQLError } from 'graphql/error';

/**
 * Whether string is empty.
 * @param value {string | null | undefined} String value.
 */
const isEmptyString = value => {
	return value === '' || value === null || value === undefined;
};

/**
 * Get byte length of a string.
 * @param value {string} String value.
 */
const getByteLength = value => {
	return new TextEncoder().encode(value).length;
};

/**
 * Abstract class for state API implementations.
 */
class StateApiAbstract {
	#env;

	constructor(env) {
		this.#env = env;
	}

	getEnv() {
		return this.#env;
	}

	/**
	 * Validate a key.
	 * @param key {string} Key to validate.
	 */
	validateKey(key) {
		if (isEmptyString(key)) {
			throw new Error(`Invalid key: ${key}`);
		}
		const keyBytes = getByteLength(key);
		const env = this.getEnv();
		if (keyBytes > env.MAX_STATE_KEY_SIZE_BYTES) {
			throw new Error(
				`Key ${key} exceeds maximum key size of ${env.MAX_STATE_KEY_SIZE_BYTES}. Received ${keyBytes} B.`,
			);
		}
	}

	/**
	 * Validate a value
	 * @param key {string} Key.
	 * @param value {string} Value to validate.
	 */
	validateValue(key, value) {
		if (isEmptyString(value)) {
			throw new Error(`Invalid value for key: ${key}`);
		}
		const valueBytes = getByteLength(value);
		const env = this.getEnv();
		if (valueBytes > env.MAX_STATE_VALUE_SIZE_BYTES) {
			throw new Error(
				`Key ${key} value exceeds maximum key size of ${env.MAX_STATE_VALUE_SIZE_BYTES}. Received ${valueBytes} B.`,
			);
		}
	}

	/**
	 * Get the TTL in milliseconds based on the provided config or environment defaults.
	 * @param config {{ ttl?: number } | undefined} Configuration object that may contain a TTL value.
	 */
	getTtl(config) {
		const env = this.getEnv();
		// Default to maximum ttl if not provided
		let useTtl = config?.ttl || env.MAX_STATE_TTL_SECONDS;
		// Set TTL to max when over maximum TTL
		if (useTtl > env.MAX_STATE_TTL_SECONDS) {
			useTtl = env.MAX_STATE_TTL_SECONDS;
		}
		// Set TTL to min seconds when under minimum TTL
		if (useTtl < env.MIN_STATE_TTL_SECONDS) {
			useTtl = env.MIN_STATE_TTL_SECONDS;
		}
		return useTtl;
	}
}

/**
 * State API implementation using Cloudflare's KV as the backing store. KV is a distributed key-value store that allows
 * for storing and retrieving key-value pairs across different worker instances with eventual consistency.
 */
class KvStateApiImpl extends StateApiAbstract {
	meshConfig;

	constructor(env, meshConfig) {
		super(env);
		this.meshConfig = meshConfig;
	}

	/**
	 * Ensure that the KV namespace is configured in the environment.
	 * @throws {GraphQLError} when the KV namespace is not configured.
	 */
	ensureKvConfigured() {
		if (!this.getEnv().MESH_KV_NAMESPACE || !this.meshConfig?.state?.enabled) {
			throw new GraphQLError(
				'Context state is not configured for this mesh. Please check your mesh configuration and try again.',
				{
					extensions: {
						code: 'ERROR_CONTEXT_STATE_NOT_CONFIGURED',
					},
				},
			);
		}
	}

	/**
	 * Get a value by key.
	 * @param key {key} Key to retrieve.
	 * @return {Promise<string | null>}
	 */
	async get(key) {
		this.ensureKvConfigured();
		this.validateKey(key);
		return this.getEnv().MESH_KV_NAMESPACE.get(key);
	}

	/**
	 * Put a key-value pair with optional TTL.
	 * @param key {string} Key to store.
	 * @param value {string} Value to store.
	 * @param config {{ ttl?: number } | undefined} Optional configuration object that may contain a TTL value in seconds.
	 * @return {Promise<void>}
	 */
	async put(key, value, config) {
		this.ensureKvConfigured();
		this.validateKey(key);
		this.validateValue(key, value);
		const ttl = this.getTtl(config);
		return this.getEnv().MESH_KV_NAMESPACE.put(key, value, { expirationTtl: ttl });
	}

	/**
	 * Delete a key-value pair.
	 * @param key {string} Key to delete.
	 * @return {Promise<void>}
	 */
	async delete(key) {
		this.ensureKvConfigured();
		this.validateKey(key);
		return this.getEnv().MESH_KV_NAMESPACE.delete(key);
	}
}

module.exports = { KvStateApiImpl };
