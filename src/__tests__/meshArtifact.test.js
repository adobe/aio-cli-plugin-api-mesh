/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('path');
jest.mock('../../src/classes/logger', () => ({
	error: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
}));

const {
	isTypeScriptFile,
	resolveComposerAsTypeScriptModule,
	resolveComposerAsJavaScriptModule,
	resolveComposerAsStaticImport,
	resolveRelativeSources,
	resolveOriginalSources,
} = require('../meshArtifact');

describe('meshArtifact', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('isTypeScriptFile', () => {
		it('returns true for .ts files', () => {
			path.extname.mockReturnValue('.ts');
			expect(isTypeScriptFile('file.ts')).toBe(true);
		});
		it('returns true for .tsx files', () => {
			path.extname.mockReturnValue('.tsx');
			expect(isTypeScriptFile('file.tsx')).toBe(true);
		});
		it('returns false for .js files', () => {
			path.extname.mockReturnValue('.js');
			expect(isTypeScriptFile('file.js')).toBe(false);
		});
	});

	describe('resolveComposerAsTypeScriptModule', () => {
		it('replaces composer string with await import', () => {
			const input = `"composer": "/path/to/file.js#fn"`;
			const output = resolveComposerAsTypeScriptModule(input);
			expect(output).toContain(`"module": await import("/path/to/file.js"), "fn": "fn"`);
		});
		it('does not replace composer string with https:// endpoint', () => {
			const input = `"composer": "https://localhost:9999/file.js#fn"`;
			const output = resolveComposerAsTypeScriptModule(input);
			expect(output).toBe(input);
		});
	});

	describe('resolveComposerAsJavaScriptModule', () => {
		it('replaces composer string with __importStar(require(...))', () => {
			const input = `"composer": "/path/to/file.js#fn"`;
			const output = resolveComposerAsJavaScriptModule(input);
			expect(output).toContain(`"module": __importStar(require("/path/to/file.js")), "fn": "fn"`);
		});
		it('does not replace composer string with https:// endpoint', () => {
			const input = `"composer": "https://localhost:9999/file.js#fn"`;
			const output = resolveComposerAsJavaScriptModule(input);
			expect(output).toBe(input);
		});
	});

	describe('resolveComposerAsStaticImport', () => {
		it('uses TypeScript resolver for .ts files', () => {
			path.extname.mockReturnValue('.ts');
			const input = `"composer": "/path/to/file.ts#fn"`;
			const output = resolveComposerAsStaticImport('file.ts', input);
			expect(output).toContain('await import');
		});
		it('uses JavaScript resolver for .js files', () => {
			path.extname.mockReturnValue('.js');
			const input = `"composer": "/path/to/file.js#fn"`;
			const output = resolveComposerAsStaticImport('file.js', input);
			expect(output).toContain('__importStar(require');
		});
	});

	describe('resolveRelativeSources', () => {
		it('replaces ../tenantFiles with ./tenantFiles in mesh artifact', async () => {
			const builtMeshTenantDir = '/mesh/tenant';
			const builtMeshPath = '/mesh/tenant/index.js';
			const artifactFilesPath = '/mesh/tenant/files.json';
			path.join.mockImplementation((...args) => args.join('/'));
			path.extname.mockReturnValue('.js');
			fs.existsSync.mockImplementation(p => p === artifactFilesPath);
			fs.readFileSync.mockReturnValue('require("../tenantFiles/some.js")');
			fs.writeFileSync.mockImplementation(() => {});

			await resolveRelativeSources(builtMeshTenantDir);

			expect(fs.writeFileSync).toHaveBeenCalledWith(
				builtMeshPath,
				expect.stringContaining('./tenantFiles'),
				'utf8',
			);
		});
	});

	describe('resolveOriginalSources', () => {
		it('replaces materializedPath with absolute path if file exists', async () => {
			const builtMeshTenantDir = '/mesh/tenant';
			const builtMeshPath = '/mesh/tenant/index.js';
			const artifactFilesPath = '/mesh/tenant/files.json';
			path.join.mockImplementation((...args) => args.join('/'));
			path.extname.mockReturnValue('.js');
			fs.existsSync.mockImplementation(p => p === artifactFilesPath || p === '/abs/file.js');
			fs.readFileSync.mockImplementation(p => {
				if (p === artifactFilesPath) {
					return JSON.stringify({
						files: [{ path: '/abs/file.js', materializedPath: '/mat/file.js' }],
					});
				}
				return 'require("/mat/file.js")';
			});
			fs.writeFileSync.mockImplementation(() => {});
			path.resolve.mockImplementation(p => p);

			await resolveOriginalSources(builtMeshTenantDir, {});

			expect(fs.writeFileSync).toHaveBeenCalledWith(
				builtMeshPath,
				expect.stringContaining('/abs/file.js'),
				'utf8',
			);
		});
	});
});
