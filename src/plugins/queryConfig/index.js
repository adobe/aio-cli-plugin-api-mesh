const { EnvelopArmorPlugin } = require('@escape.tech/graphql-armor');
const { GraphQLError } = require('graphql/error');

function rethrowWithLocalGraphQLError(_ctx, error) {
	throw new GraphQLError(error.message, {
		// Clone rather than reusing error.extensions by reference — the armor-thrown error may
		// still be held by something earlier in the pipeline (e.g. a logging plugin), and a later
		// mutation on the new error's extensions (see maskError.js) would otherwise leak back into it.
		extensions: error.extensions != null ? cloneExtensions(error.extensions) : error.extensions,
		nodes: error.nodes,
		path: error.path,
	});
}

const rejectionEnforcement = {
	propagateOnRejection: false,
	onReject: [rethrowWithLocalGraphQLError],
};

// Builds one armor protection's config: `fields` maps the protection's own option names (e.g.
// `limit`) to the shape armor expects (e.g. `n`). Disabled (no config, or config not provided)
// collapses to `{ enabled: false }` plus the shared rejection enforcement.
function buildProtection(protectionConfig, fields) {
	return {
		...(protectionConfig
			? { enabled: protectionConfig.enabled, ...fields(protectionConfig) }
			: { enabled: false }),
		...rejectionEnforcement,
	};
}

// All protections are opt-in — nothing enabled unless explicitly configured.
// blockFieldSuggestion uses a custom onValidate hook: armor's graphql@^16.10.0 creates a
// duplicate class under nohoist, breaking its instanceof GraphQLError check.
function useQueryConfig(queryConfig) {
	return [
		EnvelopArmorPlugin({
			costLimit: buildProtection(queryConfig?.costLimit, config => ({ maxCost: config.maxCost })),
			maxDepth: buildProtection(queryConfig?.maxDepth, config => ({ n: config.limit })),
			maxAliases: buildProtection(queryConfig?.maxAliases, config => ({ n: config.limit })),
			maxTokens: buildProtection(queryConfig?.maxTokens, config => ({ n: config.limit })),
			maxDirectives: buildProtection(queryConfig?.maxDirectives, config => ({ n: config.limit })),
			blockFieldSuggestion: { enabled: false },
		}),
		blockFieldSuggestionPlugin(queryConfig),
	];
}

// Returns a new error with `message` replaced rather than mutating `error` in place — the input
// may still be referenced elsewhere in the pipeline (e.g. logging plugins that ran before this one),
// and mutating a shared GraphQLError would silently rewrite what they see.
function withMessage(error, message) {
	// getOwnPropertyDescriptors returns a fresh plain object per call — safe to mutate directly
	// rather than spreading each descriptor into a new one.
	const descriptors = Object.getOwnPropertyDescriptors(error);
	descriptors.message.value = message;
	// `stack` is a lazy accessor bound to the original object's internal V8 capture — copying the
	// descriptor as-is leaves the clone with an undefined stack. Snapshot the already-computed string.
	if (descriptors.stack) {
		descriptors.stack = {
			value: error.stack,
			writable: true,
			enumerable: false,
			configurable: true,
		};
	}
	// `extensions` is an object — copying its descriptor only copies the reference, so the clone and
	// the original would still share (and could mutate) the very same extensions object. Deep-clone
	// it so a later mutation on one can't leak into the other — the same class of bug withMessage
	// exists to fix, one level deeper.
	if (descriptors.extensions?.value != null) {
		descriptors.extensions.value = cloneExtensions(descriptors.extensions.value);
	}
	return Object.create(Object.getPrototypeOf(error), descriptors);
}

// structuredClone throws (DataCloneError) on values it can't clone — a function or symbol
// anywhere in extensions, say. That would turn a normal masked-error response into an unhandled
// exception. Fall back to a shallow copy: it still isolates the top-level extensions object from
// the original (the actual bug being fixed here) even if some nested value ends up shared.
function cloneExtensions(extensions) {
	try {
		return structuredClone(extensions);
	} catch {
		return { ...extensions };
	}
}

function blockFieldSuggestionPlugin(queryConfig) {
	const enabled = queryConfig?.blockFieldSuggestion?.enabled === true;
	const mask = (queryConfig?.blockFieldSuggestion?.mask ?? '').replace(/\$/g, '$$$$');
	return {
		onValidate() {
			return function onValidateEnd({ valid, result, setResult }) {
				if (!valid && enabled) {
					setResult(
						result.map(error => {
							if (typeof error.message !== 'string') {
								return error;
							}
							const maskedMessage = error.message.replace(/Did you mean ".+"\?/g, mask).trim();
							return maskedMessage === error.message ? error : withMessage(error, maskedMessage);
						}),
					);
				}
			};
		},
	};
}

module.exports = useQueryConfig;
