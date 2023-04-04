const InitCommand = require('../init');

const mockProjectName = 'sample mesh test workspace';

const mockGitDefaultFlag = false;

const mockPMDefaultFlag = 'npm';

const mockPathDefaultFlag = '.';

describe('Workspace init command tests', () => {

    beforeEach(() => {
        logSpy = jest.spyOn(InitCommand.prototype, 'log');
		errorLogSpy = jest.spyOn(InitCommand.prototype, 'error');

		parseSpy = jest.spyOn(InitCommand.prototype, 'parse');
        createPackageJsonSpy = jest.spyOn(InitCommand.prototype, 'createPackageJson');
        createPackageJsonSpy.mockResolvedValue({});
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
                projectName: mockProjectName
            },
            flags: {
                path: mockPathDefaultFlag,
                git: mockGitDefaultFlag,
                packageManager: mockPMDefaultFlag
            }
		});
        const output = await InitCommand.run();
        console.log(output);
    })
});
