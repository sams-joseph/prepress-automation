const fs = require('fs');
const parse = require('csv-parse');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');

const inputPath = '/Volumes/G33STORE/_Hotfolders/Input/rename';
const outputPathPaint = '/Volumes/G33STORE/_Hotfolders/Output/rename/paint_files';
const outputPathLOW = '/Volumes/G33STORE/_Hotfolders/Output/rename/LOW';
const csrRepo = '/Volumes/G33STORE/_tFlow_Hotfolders/csr_repository';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';

const logger = new winston.Logger({
	level: 'verbose',
	transports: [
		new winston.transports.Console({
			timestamp: true
		}),
		new winston.transports.File({
			filename: `${logPath}/rename_prod.log`,
			timestamp: true
		})
	]
});

const loggerError = new winston.Logger({
	level: 'verbose',
	transports: [
		new winston.transports.Console({
			timestamp: true
		}),
		new winston.transports.File({
			filename: `${logPath}/app-errors.log`,
			timestamp: true
		})
	]
});

const watcher = chokidar.watch(inputPath, {
	ignored: /(^|[\/\\])\../,
	awaitWriteFinish: true,
	persistent: true
});

watcher
	.on('add', path => {
		const parser = parse({ delimiter: ',' });
		let output = [];

		parser.on('readable', function () {
			while (record = parser.read()) {
				output.push(record);
			}
		});

		parser.on('error', function (err) {
			console.log(err.message);
		});

		parser.on('finish', function () {
			output.forEach(rename => {
				copyFiles(rename[0], rename[1], `${rename[0]}.tif`, `${rename[1]}.tif`)
			});
		});

		fs.readFile(path, 'utf8', function (err, data) {
			if (err) throw err;

			parser.write(data);
			parser.end();
		});
	});


function copyFiles(origOrder, newOrder, origFilename, newFilename) {
	const input = '/Users/jsams/Desktop/rename/input';
	const output = '/Users/jsams/Desktop/rename/output';
	fs.copyFileSync(`${input}/${origFilename}`, `${output}/${newFilename}`);
}