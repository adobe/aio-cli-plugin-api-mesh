const config = {
	clearMocks: true,
	coverageDirectory: 'coverage',
	coverageProvider: 'v8',
	collectCoverage: true,
	testEnvironment: 'node',
	reporters: ['default', 'jest-junit'],
	setupFilesAfterEnv: ['./jest.setup.js'],
	testPathIgnorePatterns: ['/node_modules/'],
};

module.exports = config;
