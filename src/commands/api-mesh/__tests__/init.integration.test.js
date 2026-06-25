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

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.setTimeout(120000);

describe('init template dependency resolution', () => {
	let tmpDir;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-init-'));
		fs.copyFileSync(
			path.resolve(__dirname, '../../../templates/package.json'),
			path.join(tmpDir, 'package.json'),
		);
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	test('template package.json resolves without ERESOLVE errors', () => {
		try {
			execSync('npm install --dry-run --json', {
				cwd: tmpDir,
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
			});
		} catch (error) {
			const stderr = error.stderr || '';
			if (stderr.includes('ERESOLVE')) {
				throw new Error(`Template package.json has dependency conflicts:\n${stderr}`);
			}
			throw error;
		}
	});
});
