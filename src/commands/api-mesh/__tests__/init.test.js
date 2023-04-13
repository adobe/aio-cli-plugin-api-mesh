const InitCommand = require('../init');

jest.mock('../../../helpers', () => ({
	promptConfirm: jest.fn().mockResolvedValue(true),
	loadPupa: jest.fn(),
	runCliCommand: jest.fn().mockResolvedValue({}),
}));

const { promptConfirm, loadPupa, runCliCommand } = require('../../../helpers');

const fs = require('fs/promises');

const mockProjectName = 'sample mesh test workspace';

const mockGitDefaultFlag = false;

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
		    "allowNo": false,
		    "char": "g",
		    "parse": [Function],
		    "summary": "Should the workspace be initiated as a git project.",
		    "type": "boolean",
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
		// workspace directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalled();
		// env file creation
		expect(writeFile).toHaveBeenCalled();
		// package json file creation
		expect(createPackageJsonSpy).toHaveBeenCalled();
		// npm install
		expect(runCliCommand.mock.calls[0][0]).toBe('npm install');
	});

	test('Command should exit if prompt input is no', async () => {
		promptConfirm.mockReturnValue(false);
		runCliCommand.mockResolvedValue({});
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
		// prompt flag not set
		expect(promptConfirm).toHaveBeenCalled();
		// no git project
		expect(runCliCommand).not.toHaveBeenCalled();
		// no workspace directory creation
		expect(access).not.toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
		// no env file creation
		expect(writeFile).not.toHaveBeenCalled();
		// not creating package json
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
		expect(promptConfirm).toHaveBeenCalled();
		// initiate git repo
		expect(runCliCommand.mock.calls[0][0]).toBe('git init');
		// no workspace directory creation
		expect(access).not.toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
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

		await expect(InitCommand.run()).rejects.toThrow();
		// prompt flag not set
		expect(promptConfirm).toHaveBeenCalled();
		// git project
		expect(runCliCommand).toHaveBeenCalled();
		// no workspace directory creation
		expect(access).not.toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
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
				git: mockGitDefaultFlag,
				packageManager: 'yarn',
			},
		});

		await InitCommand.run();
		expect(promptConfirm).toHaveBeenCalled();
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
		// git initalization
		expect(runCliCommand.mock.calls[0][0]).toBe('git init');
		// no directory creation
		expect(access).not.toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
		// env file
		expect(writeFile).toHaveBeenCalled();
		// creating package json
		expect(createPackageJsonSpy).toHaveBeenCalled();
		// yarn install
		expect(runCliCommand.mock.calls[1][0]).toBe('yarn install');
	});

	test('Command should fail if directory already exists', async () => {
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

		await expect(InitCommand.run()).rejects.toThrow();

		expect(errorLogSpy.mock.calls[0][0]).toBe(
			'Directory already exists. Delete the directory or change the directory',
		);

		expect(promptConfirm).toHaveBeenCalled();
		// no directory creation
		expect(access).toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
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
		runCliCommand.mockRejectedValue('');

		await expect(InitCommand.run()).rejects.toThrow();

		expect(promptConfirm).toHaveBeenCalled();
		// no directory creation
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
		runCliCommand.mockRejectedValue('');

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
});

test('test createPackageJson', async () => {
	jest.spyOn(fs, 'readFile').mockResolvedValue({});
	jest.spyOn(fs, 'writeFile').mockResolvedValue({});
	loadPupa.mockResolvedValue(jest.fn());
	await expect(InitCommand.prototype.createPackageJson()).resolves;
});