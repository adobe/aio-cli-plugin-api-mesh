const { GraphQLError } = require('graphql/error');
const { maskError } = require('../maskError');

describe('maskError', () => {
	describe('header stripping', () => {
		it('should remove http.headers from GraphQLError extensions', () => {
			const error = new GraphQLError('oops', {
				extensions: { http: { headers: { 'set-cookie': 'x' } } },
			});
			maskError(error, { mask: false });
			expect(error.extensions?.http?.headers).toBeUndefined();
		});

		it('should leave other extensions intact when http.headers is absent', () => {
			const error = new GraphQLError('oops', { extensions: { code: 'SOME_CODE' } });
			maskError(error, { mask: false });
			expect(error.extensions?.code).toBe('SOME_CODE');
		});

		it('should return non-GraphQL errors unchanged when mask is false', () => {
			const error = new Error('plain error');
			const result = maskError(error, { mask: false });
			expect(result).toBe(error);
		});
	});

	describe('mask: true (default)', () => {
		it('should pass through errors with extensions.code', () => {
			const error = new GraphQLError('unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
			const result = maskError(error);
			expect(result).toBe(error);
		});

		it('should replace unknown GraphQL errors with generic message', () => {
			const error = new GraphQLError('internal details');
			const result = maskError(error);
			expect(result.message).toBe('Oops. Something went wrong.');
		});

		it('should replace non-GraphQL errors with generic message', () => {
			const error = new Error('internal details');
			const result = maskError(error);
			expect(result.message).toBe('Oops. Something went wrong.');
		});

		it('should use custom message from opts.message when provided', () => {
			const error = new GraphQLError('internal details');
			const result = maskError(error, { message: 'Something went wrong.' });
			expect(result.message).toBe('Something went wrong.');
		});

		it('should fall back to generic message when opts.message is not provided', () => {
			const error = new GraphQLError('internal details');
			const result = maskError(error, { mask: true });
			expect(result.message).toBe('Oops. Something went wrong.');
		});

		it('should strip http.headers before masking', () => {
			const error = new GraphQLError('oops', {
				extensions: { http: { headers: { 'set-cookie': 'x' } } },
			});
			maskError(error);
			expect(error.extensions?.http?.headers).toBeUndefined();
		});
	});

	describe('mask: false', () => {
		it('should return the original error message unchanged', () => {
			const error = new GraphQLError('internal details');
			const result = maskError(error, { mask: false });
			expect(result.message).toBe('internal details');
		});

		it('should ignore opts.message when masking is disabled', () => {
			const error = new GraphQLError('internal details');
			const result = maskError(error, { mask: false, message: 'Should be ignored.' });
			expect(result.message).toBe('internal details');
		});
	});
});
