const { EnvelopArmorPlugin } = require('@escape.tech/graphql-armor');
const useQueryConfig = require('../index');

jest.mock('@escape.tech/graphql-armor', () => ({
	EnvelopArmorPlugin: jest.fn(() => ({ pluginName: 'EnvelopArmor' })),
}));

beforeEach(() => {
	EnvelopArmorPlugin.mockClear();
});

describe('useQueryConfig', () => {
	describe('no config — all protections disabled', () => {
		it('disables all protections when called with undefined', () => {
			useQueryConfig(undefined);
			expect(EnvelopArmorPlugin).toHaveBeenCalledWith({
				costLimit: { enabled: false },
				maxDepth: { enabled: false },
				maxAliases: { enabled: false },
				maxTokens: { enabled: false },
				maxDirectives: { enabled: false },
				blockFieldSuggestion: { enabled: false },
			});
		});

		it('disables all protections when called with empty object', () => {
			useQueryConfig({});
			expect(EnvelopArmorPlugin).toHaveBeenCalledWith({
				costLimit: { enabled: false },
				maxDepth: { enabled: false },
				maxAliases: { enabled: false },
				maxTokens: { enabled: false },
				maxDirectives: { enabled: false },
				blockFieldSuggestion: { enabled: false },
			});
		});
	});

	describe('maxDepth', () => {
		it('passes enabled and limit (mapped to n) to armor', () => {
			useQueryConfig({ maxDepth: { enabled: true, limit: 5 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDepth).toEqual({ enabled: true, n: 5 });
		});

		it('passes enabled: false with no limit', () => {
			useQueryConfig({ maxDepth: { enabled: false } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDepth).toEqual({ enabled: false, n: undefined });
		});

		it('passes enabled: false with limit retained', () => {
			useQueryConfig({ maxDepth: { enabled: false, limit: 3 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDepth).toEqual({ enabled: false, n: 3 });
		});
	});

	describe('maxAliases', () => {
		it('passes enabled and limit (mapped to n)', () => {
			useQueryConfig({ maxAliases: { enabled: true, limit: 10 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxAliases).toEqual({ enabled: true, n: 10 });
		});

		it('passes n: undefined when enabled but no limit — armor uses its default', () => {
			useQueryConfig({ maxAliases: { enabled: true } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxAliases).toEqual({ enabled: true, n: undefined });
		});
	});

	describe('maxTokens', () => {
		it('passes enabled and limit (mapped to n)', () => {
			useQueryConfig({ maxTokens: { enabled: true, limit: 500 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxTokens).toEqual({ enabled: true, n: 500 });
		});
	});

	describe('maxDirectives', () => {
		it('passes enabled and limit (mapped to n)', () => {
			useQueryConfig({ maxDirectives: { enabled: true, limit: 25 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].maxDirectives).toEqual({ enabled: true, n: 25 });
		});
	});

	describe('costLimit', () => {
		it('passes enabled and maxCost', () => {
			useQueryConfig({ costLimit: { enabled: true, maxCost: 2000 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].costLimit).toEqual({ enabled: true, maxCost: 2000 });
		});

		it('passes enabled: false with maxCost retained', () => {
			useQueryConfig({ costLimit: { enabled: false, maxCost: 1000 } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].costLimit).toEqual({ enabled: false, maxCost: 1000 });
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
			plugin.onValidate()({ valid: false, result: errors, setResult: (e) => { result = e; } });
			return result.map(e => e.message);
		}

		it('should always pass { enabled: false } to armor', () => {
			useQueryConfig({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } });
			expect(EnvelopArmorPlugin.mock.calls[0][0].blockFieldSuggestion).toEqual({ enabled: false });
		});

		it('should strip "Did you mean" hint when enabled', () => {
			const out = runValidate(getPlugin({ blockFieldSuggestion: { enabled: true } }), ['Cannot query field "continentz". Did you mean "continents"?']);
			expect(out[0]).toBe('Cannot query field "continentz".');
		});

		it('should use custom mask when provided', () => {
			const out = runValidate(getPlugin({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } }), ['Cannot query field "foo". Did you mean "bar"?']);
			expect(out[0]).toBe('Cannot query field "foo". [hidden]');
		});

		it('should not strip hint when disabled', () => {
			const out = runValidate(getPlugin({ blockFieldSuggestion: { enabled: false } }), ['Cannot query field "x". Did you mean "y"?']);
			expect(out[0]).toBe('Cannot query field "x". Did you mean "y"?');
		});

		it('should strip multi-candidate hint with custom mask', () => {
			const out = runValidate(getPlugin({ blockFieldSuggestion: { enabled: true, mask: '[hidden]' } }), ['Cannot query field "nam". Did you mean "name", "names", or "named"?']);
			expect(out[0]).toBe('Cannot query field "nam". [hidden]');
		});
	});

	describe('maskErrors', () => {
		it('is not passed to EnvelopArmorPlugin — handled separately via yoga maskedErrors', () => {
			useQueryConfig({ maskErrors: { enabled: true, message: 'Unexpected error.' } });
			expect(EnvelopArmorPlugin.mock.calls[0][0]).not.toHaveProperty('maskErrors');
		});
	});
});
