const { GraphQLError } = require('graphql/error');

// Always strips http.headers from extensions (prevents duplicate Set-Cookie → Cloudflare error).
// When mask is true (default): errors with extensions.code pass through; all others are replaced
// with opts.message to avoid leaking stack traces or internal details.
const maskError = (error, opts) => {
	if (error instanceof GraphQLError && error.extensions?.http?.headers) {
		delete error.extensions.http.headers;
	}

	if (opts?.mask !== false) {
		if (error instanceof GraphQLError && error.extensions?.code) {
			return error;
		}
		return new GraphQLError(opts?.message || 'Oops. Something went wrong.');
	}

	return error;
};

module.exports = { maskError };
