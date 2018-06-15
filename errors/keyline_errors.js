const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');
const productItems = require('../product-items.json');
const notifier = require('node-notifier');

const keylineErrorPath = '/Volumes/G33STORE/_callas_server/_keyline/error';
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

const watcher = chokidar.watch(keylineErrorPath, {
	ignored: /(^|[\/\\])\../,
	awaitWriteFinish: true,
	persistent: true
});

watcher
	.on('add', orig => {
		try {
			const filename = orig.split('/').pop();
			logger.info(`${filename} has encountered an error during the keyline process`);
			notifier.notify({
				title: filename,
				message: 'Error during the keyline process',
				icon: path.join(__dirname, '/images/logo.png'),
				contentImage: path.join(__dirname, '/images/icon.png'),
				closeLabel: 'Close',
			});
		} catch (error) {
			loggerError.error(error);
		}
	});
