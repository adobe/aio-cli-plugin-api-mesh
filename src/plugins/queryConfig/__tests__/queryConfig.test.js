const { EnvelopArmorPlugin } = require('@escape.tech/graphql-armor');
const { GraphQLError } = require('graphql/error');
const useQueryConfig = require('../index');

jest.mock('@escape.tech/graphql-armor', () => ({
	EnvelopArmorPlugin: jest.fn(() => ({ pluginName: 'EnvelopArmor' })),
}));

beforeEach(() => {
	EnvelopArmorPlugin.mockClear();
});

// Every armor protection is wired with the same rejectionEnforcement (propagateOnRejection:
// false + onReject rethrow) regardless of enabled state, so assertions merge it in explicitly
// rather than repeating it per test.
const rejectionEnforcement = {
	propagateOnRejection: false,
	onReject: [expect.any(Function)],
};

describe('useQueryConfig', () => {
	describe('no config — all protections disabled', () => {
		it('disables all protections when called with undefined', () => {
			useQueryConfig(undefined);
			expect(EnvelopArmorPlugin).toHaveBeenCalledWith({
				costLimit: { enabled: false, ...rejectionEnforcement },
				maxDepth: { enabled: false, ...rejectionEnforcement },
				maxAliases: { enabled: false, ...rejectionEnforcement },
				maxTokens: { enabled: false, ...rejectionEnforcement },
				maxDirectives: { enabled: false, ...rejectionEnforcement },
				blockFieldSuggestion: { enabled: false },
			});
		});

		it('disables all protections when called with empty object', () => {
			useQueryConfig({});
			expect(EnvelopArmorPlugin).toHaveBeenCalledWith({
				costLimit: { enabled: false, ...rejectionEnforcement },
				maxDepth: { enabled: false, ...rejectionEnforcement },
				maxAliases: { enabled: false, ...rejectionEnforcement },
				maxTokens: { enabled: false, ...rejectionEnforcement },
				maxDirectives: { enabled: false, ...rejectionEnforcement },
				blockFieldSuggestion: { enabled: false },
			});
		});
	});

	describe('maxDepth', () => {
		it('passes enabled and limit (mapped to n) to armor', () => {
			useQueryConfig({ maxDepth: { enabled: true, limit: 5 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDepth).toEqual({
				enabled: true,
				n: 5,
				...rejectionEnforcement,
			});
		});

		it('passes enabled: false with no limit', () => {
			useQueryConfig({ maxDepth: { enabled: false } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDepth).toEqual({
				enabled: false,
				n: undefined,
				...rejectionEnforcement,
			});
		});

		it('passes enabled: false with limit retained', () => {
			useQueryConfig({ maxDepth: { enabled: false, limit: 3 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDepth).toEqual({
				enabled: false,
				n: 3,
				...rejectionEnforcement,
			});
		});
	});

	describe('maxAliases', () => {
		it('passes enabled and limit (mapped to n)', () => {
			useQueryConfig({ maxAliases: { enabled: true, limit: 10 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxAliases).toEqual({
				enabled: true,
				n: 10,
				...rejectionEnforcement,
			});
		});

		it('passes n: undefined when enabled but no limit — armor uses its default', () => {
			useQueryConfig({ maxAliases: { enabled: true } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxAliases).toEqual({
				enabled: true,
				n: undefined,
				...rejectionEnforcement,
			});
		});
	});

	describe('maxTokens', () => {
		it('passes enabled and limit (mapped to n)', () => {
			useQueryConfig({ maxTokens: { enabled: true, limit: 500 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxTokens).toEqual({
				enabled: true,
				n: 500,
				...rejectionEnforcement,
			});
		});
	});

	describe('maxDirectives', () => {
		it('passes enabled and limit (mapped to n)', () => {
			useQueryConfig({ maxDirectives: { enabled: true, limit: 25 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDirectives).toEqual({
				enabled: true,
				n: 25,
				...rejectionEnforcement,
			});
		});
	});

	describe('costLimit', () => {
		it('passes enabled and maxCost', () => {
			useQueryConfig({ costLimit: { enabled: true, maxCost: 2000 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].costLimit).toEqual({
				enabled: true,
				maxCost: 2000,
				...rejectionEnforcement,
			});
		});

		it('passes enabled: false with maxCost retained', () => {
			useQueryConfig({ costLimit: { enabled: false, maxCost: 1000 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].costLimit).toEqual({
				enabled: false,
				maxCost: 1000,
				...rejectionEnforcement,
			});
		});
	});

	describe('blockFieldSuggestion', () => {
		function getPlugin(queryConfig) {
			const [, plugin] = useQueryConfig(queryConfig);
			return plugin;
		}

		function runValidate(plugin, messages) {
			const errors = messages.map(m => Object.assign(new Error(m), {}));
			let result = errors;
			plugin.onValidate()({
				valid: false,
				result: errors,
				setResult: e => {
					result = e;
				},
			});
			return result.map(e => e.message);
		}

		it('should always pass { enabled: false } to armor', () => {
			useQueryConfig({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].blockFieldSuggestion).toEqual({ enabled: false });
		});

		it('should strip "Did you mean" hint when enabled', () => {
			const out = runValidate(getPlugin({ blockFieldSuggestion: { enabled: true } }), [
				'Cannot query field "continentz". Did you mean "continents"?',
			]);
			expect(out[0]).toBe('Cannot query field "continentz".');
		});

		it('should use custom mask when provided', () => {
			const out = runValidate(
				getPlugin({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } }),
				['Cannot query field "foo". Did you mean "bar"?'],
			);
			expect(out[0]).toBe('Cannot query field "foo". [hidden]');
		});

		it('should not strip hint when disabled', () => {
			const out = runValidate(getPlugin({ blockFieldSuggestion: { enabled: false } }), [
				'Cannot query field "x". Did you mean "y"?',
			]);
			expect(out[0]).toBe('Cannot query field "x". Did you mean "y"?');
		});

		it('should strip multi-candidate hint with custom mask', () => {
			const out = runValidate(
				getPlugin({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } }),
				['Cannot query field "nam". Did you mean "name", "names", or "named"?'],
			);
			expect(out[0]).toBe('Cannot query field "nam". [hidden]');
		});

		it('should escape "$" in a custom mask so it is not treated as a replace() backreference', () => {
			const out = runValidate(
				getPlugin({ blockFieldSuggestion: { enabled: true, mask: '$& $1 [hidden]' } }),
				['Cannot query field "foo". Did you mean "bar"?'],
			);
			expect(out[0]).toBe('Cannot query field "foo". $& $1 [hidden]');
		});

		it('should not mutate the original error object when masking', () => {
			const original = Object.assign(new Error('Cannot query field "foo". Did you mean "bar"?'), {
				extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
			});
			const plugin = getPlugin({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } });
			let masked;
			plugin.onValidate()({
				valid: false,
				result: [original],
				setResult: errors => {
					masked = errors[0];
				},
			});

			expect(original.message).toBe('Cannot query field "foo". Did you mean "bar"?');
			expect(masked.message).toBe('Cannot query field "foo". [hidden]');
			expect(masked).not.toBe(original);
		});

		it('should deep-clone extensions so mutating the masked error does not affect the original', () => {
			const original = Object.assign(new Error('Cannot query field "foo". Did you mean "bar"?'), {
				extensions: { http: { headers: { 'x-secret': '1' } } },
			});
			const plugin = getPlugin({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } });
			let masked;
			plugin.onValidate()({
				valid: false,
				result: [original],
				setResult: errors => {
					masked = errors[0];
				},
			});

			delete masked.extensions.http.headers;
			expect(original.extensions.http.headers).toEqual({ 'x-secret': '1' });
		});
	});

	describe('rejection enforcement (onReject)', () => {
		function getOnReject(protectionKey) {
			useQueryConfig({ [protectionKey]: { enabled: true, limit: 1 } });
			const [onReject] = EnvelopArmorPlugin.mock.calls[0][0][protectionKey].onReject;
			return onReject;
		}

		it('rethrows a local GraphQLError carrying the same message, extensions, nodes, and path', () => {
			const onReject = getOnReject('maxDepth');
			const armorError = {
				message: 'Query depth limit of 1 exceeded.',
				extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
				nodes: ['node-placeholder'],
				path: ['query', 'foo'],
			};

			let thrown;
			try {
				onReject({}, armorError);
			} catch (e) {
				thrown = e;
			}

			expect(thrown).toBeInstanceOf(GraphQLError);
			expect(thrown.message).toBe(armorError.message);
			expect(thrown.extensions).toEqual(armorError.extensions);
			expect(thrown.nodes).toEqual(armorError.nodes);
			expect(thrown.path).toEqual(armorError.path);
		});
	});

	describe('maskErrors', () => {
		it('is not passed to EnvelopArmorPlugin — handled separately via yoga maskedErrors', () => {
			useQueryConfig({ maskErrors: { enabled: true, message: 'Unexpected error.' } });
			expect(EnvelopArmorPlugin.mock.calls[0][0]).not.toHaveProperty('maskErrors');
		});
	});
});
