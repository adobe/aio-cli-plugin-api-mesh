const InitCommand = require('../init');

jest.mock('../../../helpers', () => ({
	promptConfirm: jest.fn().mockResolvedValue(true),
	loadPupa: jest.fn().mockResolvedValue({}),
	runCliCommand: jest.fn(),
}));

const { promptConfirm, loadPupa, runCliCommand } = require('../../../helpers');

const fs = require('fs/promises');

const mockProjectName = 'sample mesh test workspace';

const mockGitDefaultFlag = false;

const mockPMDefaultFlag = 'npm';

const mockPathDefaultFlag = '.';

let logSpy = null;

let errorLogSpy = null;

let createPackageJsonSpy = null;

let parseSpy = null;

let readFile,
	writeFile,
	access,
	mkdir = null;

describe('Workspace init command tests', () => {
	beforeEach(() => {
		logSpy = jest.spyOn(InitCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(InitCommand.prototype, 'error');
		parseSpy = jest.spyOn(InitCommand.prototype, 'parse');
		createPackageJsonSpy = jest.spyOn(InitCommand.prototype, 'createPackageJson');
		createPackageJsonSpy.mockResolvedValue({});
		access = jest.spyOn(fs, 'access').mockRejectedValue(new Error());
		writeFile = jest.spyOn(fs, 'writeFile').mockResolvedValue({});
		access = jest.spyOn(fs, 'access').mockResolvedValue({});
		mkdir = jest.spyOn(fs, 'mkdir').mockResolvedValue({});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('Snapshot of Init command', () => {
		expect(InitCommand.description).toMatchInlineSnapshot(
			`"This command will create a workspace where you can organise your API mesh configuration and other files"`,
		);
		expect(InitCommand.summary).toMatchInlineSnapshot('"Initiate API Mesh workspace"');
		expect(InitCommand.args).toMatchInlineSnapshot(`
		[
		  {
		    "description": "Project name",
		    "name": "projectName",
		    "required": true,
		  },
		]
	`);
		expect(InitCommand.flags).toMatchInlineSnapshot(`
		{
		  "git": {
		    "allowNo": false,
		    "char": "g",
		    "default": false,
		    "helpGroup": "THE BEST FLAGS",
		    "parse": [Function],
		    "summary": "Should the workspace be initiated as a git project.",
		    "type": "boolean",
		  },
		  "packageManager": {
		    "char": "m",
		    "default": "npm",
		    "helpGroup": "THE BEST FLAGS",
		    "input": [],
		    "multiple": false,
		    "options": [
		      "npm",
		      "yarn",
		    ],
		    "parse": [Function],
		    "summary": "select yarn or npm for package management",
		    "type": "option",
		  },
		  "path": {
		    "char": "p",
		    "default": ".",
		    "input": [],
		    "multiple": false,
		    "parse": [Function],
		    "summary": "workspace path",
		    "type": "option",
		  },
		}
	`);
	});

	test('Command should pass with no flags using default arguments', async () => {
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: mockPathDefaultFlag,
				git: mockGitDefaultFlag,
				packageManager: mockPMDefaultFlag,
			},
		});
		await InitCommand.run();
		expect(promptConfirm).toHaveBeenCalled();
		expect(access).toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		expect(createPackageJsonSpy).toHaveBeenCalled();
		expect(runCliCommand.mock.calls[0][0]).toBe('npm install');
	});

	test('Command should exit if prompt input is no', async () => {
		promptConfirm.mockReturnValue(false);
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: mockPathDefaultFlag,
				git: mockGitDefaultFlag,
				packageManager: mockPMDefaultFlag,
			},
		});
		await InitCommand.run();
		expect(runCliCommand).not.toHaveBeenCalled();
		expect(access).not.toHaveBeenCalled();
		expect(writeFile).not.toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
		expect(createPackageJsonSpy).not.toHaveBeenCalled();
	});

	test('Command should pass and create git project if git flag is provided', async () => {
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: mockPathDefaultFlag,
				git: true,
				packageManager: mockPMDefaultFlag,
			},
		});
		await InitCommand.run();
		expect(runCliCommand.mock.calls[0][0]).toBe('git init');
		expect(access).not.toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
		expect(promptConfirm).toHaveBeenCalled();
		expect(createPackageJsonSpy).toHaveBeenCalled();
		expect(runCliCommand.mock.calls[1][0]).toBe('npm install');
	});

	test('Command should pass and create yarn project if yarn is package manager', async () => {
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: mockPathDefaultFlag,
				git: mockGitDefaultFlag,
				packageManager: 'yarn',
			},
		});
		await InitCommand.run();
		expect(access).toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		expect(promptConfirm).toHaveBeenCalled();
		expect(createPackageJsonSpy).toHaveBeenCalled();
		expect(runCliCommand.mock.calls[0][0]).toBe('yarn install');
	});
});
