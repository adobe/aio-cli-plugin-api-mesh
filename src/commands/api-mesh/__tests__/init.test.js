const InitCommand = require('../init');

jest.mock('../../../helpers', () => ({
	promptConfirm: jest.fn().mockResolvedValue(true),
	promptSelect: jest.fn(),
	runCliCommand: jest.fn().mockResolvedValue({}),
}));

const { promptConfirm, runCliCommand, promptSelect } = require('../../../helpers');

const fs = require('fs/promises');

const mockProjectName = 'sample mesh test workspace';

const mockGitDefaultFlag = 'n';

const mockPMDefaultFlag = 'npm';

const mockPathDefaultFlag = '.';

let errorLogSpy = null;

let createPackageJsonSpy = null;

let parseSpy = null;

let writeFile,
	access,
	mkdir = null;

describe('Workspace init command tests', () => {
	beforeEach(() => {
		promptConfirm.mockResolvedValue(true);
		runCliCommand.mockResolvedValue({});
		errorLogSpy = jest.spyOn(InitCommand.prototype, 'error');
		parseSpy = jest.spyOn(InitCommand.prototype, 'parse');
		createPackageJsonSpy = jest.spyOn(InitCommand.prototype, 'createPackageJson');
		createPackageJsonSpy.mockResolvedValue({});
		access = jest.spyOn(fs, 'access').mockRejectedValue(new Error());
		writeFile = jest.spyOn(fs, 'writeFile').mockResolvedValue({});
		mkdir = jest.spyOn(fs, 'mkdir').mockResolvedValue({});
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
		    "char": "g",
		    "input": [],
		    "multiple": false,
		    "options": [
		      "y",
		      "n",
		    ],
		    "parse": [Function],
		    "summary": "Should the workspace be initiated as a git project.",
		    "type": "option",
		  },
		  "packageManager": {
		    "char": "m",
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

	test('Command should pass with no flags', async () => {
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: './template',
			},
		});
		promptSelect.mockResolvedValue('yarn');
		await InitCommand.run();
		expect(promptConfirm).toHaveBeenCalled();
		expect(promptSelect).toHaveBeenCalled();

		// workspace directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		expect(runCliCommand.mock.calls[0][0]).toBe('git init');
		// env file creation
		expect(writeFile).toHaveBeenCalled();
		// package json file creation
		expect(createPackageJsonSpy).toHaveBeenCalled();
		// yarn install
		expect(runCliCommand.mock.calls[1][0]).toBe('yarn install');
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
		expect(promptConfirm).toHaveBeenCalled();

		// initiate git repo
		expect(runCliCommand.mock.calls[0][0]).toBe('git init');
		// no workspace directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// creating env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
		// run npm install
		expect(runCliCommand.mock.calls[1][0]).toBe('npm install');
	});

	test('Command should fail if git flag is provided and git init fails', async () => {
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

		runCliCommand.mockRejectedValue('');

		// git comman failed
		await expect(InitCommand.run()).rejects.toThrow();
		// prompt flag not set
		expect(promptConfirm).toHaveBeenCalled();
		// git project
		expect(runCliCommand).toHaveBeenCalled();
		// no workspace directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// no env file creation
		expect(writeFile).not.toHaveBeenCalled();
		// not creating package json
		expect(createPackageJsonSpy).not.toHaveBeenCalled();
	});

	test('Command should pass and create yarn project if yarn is package manager', async () => {
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: mockPathDefaultFlag,
				packageManager: 'yarn',
				git: mockGitDefaultFlag,
			},
		});

		await InitCommand.run();

		// workspace directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
		// yarn install
		expect(runCliCommand.mock.calls[0][0]).toBe('yarn install');
	});

	test('Command should pass and create yarn + git project if yarn is package manager and git flag is set', async () => {
		parseSpy.mockResolvedValue({
			args: {
				projectName: mockProjectName,
			},
			flags: {
				path: mockPathDefaultFlag,
				git: true,
				packageManager: 'yarn',
			},
		});
		await InitCommand.run();
		expect(promptConfirm).toHaveBeenCalled();
		// create directory
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
		// yarn install
		expect(runCliCommand.mock.calls[1][0]).toBe('yarn install');
	});

	test('Command should pass with creating the sub directory if the directory already exists', async () => {
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
		access.mockResolvedValue({});

		await InitCommand.run();

		expect(promptConfirm).toHaveBeenCalled();
		// no directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
	});

	test('Command should fail if the directory already exists and sub directory of project name exists', async () => {
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
		access.mockResolvedValue({});
		mkdir.mockRejectedValue(new Error());

		await expect(InitCommand.run()).rejects.toThrow();
		expect(promptConfirm).toHaveBeenCalled();
		// no directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();

		// error log called
		expect(errorLogSpy).toHaveBeenCalled();
		// env file
		expect(writeFile).not.toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).not.toHaveBeenCalled();
	});

	test('Command should fail if directory creation fails', async () => {
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
		mkdir.mockRejectedValue(new Error());
		await expect(InitCommand.run()).rejects.toThrow();

		expect(errorLogSpy.mock.calls[0][0]).toMatch(/Could not create directory/);

		expect(promptConfirm).toHaveBeenCalled();
		// no directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file
		expect(writeFile).not.toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).not.toHaveBeenCalled();
	});

	test('Command should fail if npm install fails', async () => {
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

		runCliCommand.mockRejectedValueOnce('');

		await expect(InitCommand.run()).rejects.toThrow();

		expect(promptConfirm).toHaveBeenCalled();
		// create directory
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
		expect(runCliCommand.mock.calls[0][0]).toBe('npm install');
	});

	test('Command should fail if yarn install fails', async () => {
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
		// npm command will fail
		runCliCommand.mockRejectedValueOnce('');

		await expect(InitCommand.run()).rejects.toThrow();

		expect(promptConfirm).toHaveBeenCalled();
		// no directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
		expect(runCliCommand.mock.calls[0][0]).toBe('yarn install');
	});

	test('Command should exit if sub directory prompt is provided with no', async () => {
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
		// create workspace prompt
		promptConfirm.mockResolvedValueOnce(true);
		// access passes
		access.mockResolvedValue({});
		// create in sub directory prompt
		promptConfirm.mockResolvedValueOnce(false);
		await InitCommand.run();
		expect(access).toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
	});
});

test('test createPackageJson', async () => {
	jest.spyOn(fs, 'readFile').mockResolvedValue({});
	jest.spyOn(fs, 'writeFile').mockResolvedValue({});

	await expect(InitCommand.prototype.createPackageJson()).resolves;
});
