const puppeteer = require('puppeteer');
const fs = require('fs');

const htmlFileName = process.argv[2];

if (!htmlFileName) {
	console.error('Please provide the HTML file name to convert to PDF');
	process.exit(1);
}

const pdfFileName = htmlFileName.replace('.html', '.pdf');

console.log(`Converting ${htmlFileName} to ${pdfFileName}`);

async function convertHTMLReportToPDF() {
	// Create a browser instance
	const browser = await puppeteer.launch();

	// Create a new page
	const page = await browser.newPage();

	//Get HTML content from HTML file
	const html = fs.readFileSync(htmlFileName, 'utf-8');
	await page.setContent(html, { waitUntil: 'domcontentloaded' });

	// To reflect CSS used for screens instead of print
	await page.emulateMediaType('screen');

	// Downlaod the PDF
	await page.pdf({
		path: pdfFileName,
		margin: { top: '100px', right: '50px', bottom: '100px', left: '50px' },
		printBackground: true,
		format: 'A4',
	});

	// Close the browser instance
	await browser.close();
}

convertHTMLReportToPDF()
	.then(() => {
		console.log(`PDF generated at ${pdfFileName}`);

		// read the PDF file size
		const stats = fs.statSync(pdfFileName);
		const fileSizeInBytes = stats.size;
		console.log(`PDF file size: ${fileSizeInBytes} bytes`);
	})
	.catch(error => {
		console.error(`Error occurred: ${error}`);
	});
