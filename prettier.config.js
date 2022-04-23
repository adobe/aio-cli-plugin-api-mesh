const config = {
	printWidth: 100,
	tabWidth: 2,
	useTabs: true,
	singleQuote: true,
	quoteProps: 'consistent',
	trailingComma: 'all',
	arrowParens: 'avoid',
	endOfLine: 'lf',

	// config options to be passed to prettier-plugin-sort-imports
	importOrder: ['^[./]'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
};

module.exports = config;