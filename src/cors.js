/**
 * Get default CORS options.
 * @param env Environment.
 */
const getDefaultCorsOptions = env => {
	return env.CORS_DEFAULT_URL
		? {
				origin: env.CORS_DEFAULT_URL,
		  }
		: {};
};

/**
 * Get CORS options. Merges default CORS options with custom specific options if present in the mesh configuration.
 * Custom CORS options overwrite the default options to ensure that specific requirements can be met without altering
 * the default configuration.
 * @param env Environment.
 * @param meshConfig Mesh configuration.
 */
const getCorsOptions = (env, meshConfig) => {
	const defaultCorsOptions = getDefaultCorsOptions(env);
	return {
		...defaultCorsOptions,
		...meshConfig.responseConfig?.CORS,
	};
};

module.exports = { getCorsOptions };
