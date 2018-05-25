const fs = require('fs');
const parse = require('csv-parse');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');

const inputPath = '/Volumes/G33STORE/_Hotfolders/Output/rename/paint_files';
const outputPathPaint = '/Volumes/G33STORE/_Hotfolders/Output/rename/paint_files';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';


const watcher = chokidar.watch(inputPath, {
	ignored: /(^|[\/\\])\../,
	awaitWriteFinish: true,
	persistent: true
});

watcher
	.on('add', path => {
		const wip = '/Volumes/G33STORE/WIP';
		const filename = path.split('/').pop();
		const jobNumber = filename.substring(0, 9);

		fs.rename(path, `${wip}/${jobNumber}/paint_files/${jobNumber}hr10.tif`, () => {
			console.log(`${jobNumber} moved to WIP`);
		})
	});