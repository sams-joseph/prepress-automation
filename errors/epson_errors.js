const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');
const productItems = require('../product-items.json');
const notifier = require('node-notifier');

const epsonTiffErrorPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_export tiff/error';
const epsonPreErrorPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_pre-scale/error';
const epsonScaleTiffErrorPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_scale_tiff/error';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';

const logger = new winston.Logger({
	level: 'verbose',
	transports: [
		new winston.transports.Console({
			timestamp: true
		}),
		new winston.transports.File({
			filename: `${logPath}/error_catch.log`,
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

const epsonTiffWatcher = chokidar.watch(epsonTiffErrorPath, {
	ignored: /(^|[\/\\])\../,
	awaitWriteFinish: true,
	persistent: true
});

epsonTiffWatcher
	.on('add', orig => {
		try {
			const filename = orig.split('/').pop();
			logger.info(`${filename} has encountered an error during the epson tiff export process`);
			notifier.notify({
				title: filename,
				message: 'Error during the epson tiff export process',
				icon: path.join(__dirname, '/images/logo.png'),
				sound: true,
				wait: true
			});
		} catch (error) {
			loggerError.error(error);
		}
	});

const epsonPreWatcher = chokidar.watch(epsonPreErrorPath, {
	ignored: /(^|[\/\\])\../,
	awaitWriteFinish: true,
	persistent: true
});

epsonPreWatcher
	.on('add', orig => {
		try {
			const filename = orig.split('/').pop();
			logger.info(`${filename} has encountered an error during the epson pre-scale process`);
			notifier.notify({
				title: filename,
				message: 'Error during the epson pre-scale process',
				icon: path.join(__dirname, '/images/logo.png'),
				sound: true,
				wait: true
			});
		} catch (error) {
			loggerError.error(error);
		}
	});

const epsonScaleWatcher = chokidar.watch(epsonScaleTiffErrorPath, {
	ignored: /(^|[\/\\])\../,
	awaitWriteFinish: true,
	persistent: true
});

epsonScaleWatcher
	.on('add', orig => {
		try {
			const filename = orig.split('/').pop();
			logger.info(`${filename} has encountered an error during the epson tiff scale process`);
			notifier.notify({
				title: filename,
				message: 'Error during the epson tiff scale process',
				icon: path.join(__dirname, '/images/logo.png'),
				sound: true,
				wait: true
			});
		} catch (error) {
			loggerError.error(error);
		}
	});