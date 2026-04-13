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
const os = require('os');
const path = require('path');
const { readSecretsFile } = require('../../../serverUtils');
const { loadMeshSecrets } = require('../../../secrets');

describe('readSecretsFile', () => {
	let tmp;
	let prevCwd;

	afterEach(() => {
		if (prevCwd !== undefined) {
			process.chdir(prevCwd);
			prevCwd = undefined;
		}
		if (tmp) {
			fs.rmSync(tmp, { recursive: true, force: true });
			tmp = undefined;
		}
	});

	test('parses JSON object strings in secrets.yaml like the tenant worker', () => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'readSecretsFile-test-'));
		const meshDir = path.join(tmp, '.mesh');
		fs.mkdirSync(meshDir, { recursive: true });
		fs.writeFileSync(
			path.join(meshDir, 'secrets.yaml'),
			`TOKEN: '{"COMMERCE": "dummy-value"}'\nPLAIN: not-json\n`,
			'utf8',
		);
		prevCwd = process.cwd();
		process.chdir(tmp);

		const secrets = readSecretsFile('.mesh');

		expect(secrets.TOKEN).toEqual({ COMMERCE: 'dummy-value' });
		expect(secrets.PLAIN).toBe('not-json');

		const mockLogger = { error: jest.fn() };
		const asWorkerSees = loadMeshSecrets(mockLogger, JSON.stringify(secrets));
		expect(asWorkerSees.TOKEN.COMMERCE).toBe('dummy-value');
		expect(asWorkerSees.PLAIN).toBe('not-json');
		expect(mockLogger.error).not.toHaveBeenCalled();
	});
});
