const { EnvelopArmorPlugin } = require('@escape.tech/graphql-armor');

// All protections are opt-in — nothing enabled unless explicitly configured.
// blockFieldSuggestion uses a custom onValidate hook: armor's graphql@^16.10.0 creates a
// duplicate class under nohoist, breaking its instanceof GraphQLError check.
function useQueryConfig(queryConfig) {
	return [
		EnvelopArmorPlugin({
			costLimit: queryConfig?.costLimit
				? { enabled: queryConfig.costLimit.enabled, maxCost: queryConfig.costLimit.maxCost }
				: { enabled: false },
			maxDepth: queryConfig?.maxDepth
				? { enabled: queryConfig.maxDepth.enabled, n: queryConfig.maxDepth.limit }
				: { enabled: false },
			maxAliases: queryConfig?.maxAliases
				? { enabled: queryConfig.maxAliases.enabled, n: queryConfig.maxAliases.limit }
				: { enabled: false },
			maxTokens: queryConfig?.maxTokens
				? { enabled: queryConfig.maxTokens.enabled, n: queryConfig.maxTokens.limit }
				: { enabled: false },
			maxDirectives: queryConfig?.maxDirectives
				? { enabled: queryConfig.maxDirectives.enabled, n: queryConfig.maxDirectives.limit }
				: { enabled: false },
			blockFieldSuggestion: { enabled: false },
		}),
		blockFieldSuggestionPlugin(queryConfig),
	];
}

function blockFieldSuggestionPlugin(queryConfig) {
	const enabled = queryConfig?.blockFieldSuggestion?.enabled === true;
	const mask = queryConfig?.blockFieldSuggestion?.mask ?? '';
	return {
		onValidate() {
			return function onValidateEnd({ valid, result, setResult }) {
				if (!valid && enabled) {
					setResult(
						result.map(error => {
							if (typeof error.message === 'string') {
								error.message = error.message.replace(/Did you mean ".+"\?/g, mask).trim();
							}
							return error;
						}),
					);
				}
			};
		},
	};
}

module.exports = useQueryConfig;
