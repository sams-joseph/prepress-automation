const fs = require('fs');
const chokidar = require('chokidar');
const nodemailer = require('nodemailer');
const winston = require('winston');
const axios = require('axios');
const productItems = require('../product-items.json');

const keylineErrorPath = '/Volumes/G33STORE/_callas_server/_keyline/error';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';
const from = '"MMT Preflight" <no-reply@mmt.com>';

function setup() {
	return nodemailer.createTransport({
		host: process.env.MAILHOST,
		port: process.env.MAILPORT,
		auth: {
			user: process.env.MAILUSER,
			pass: process.env.MAILPASS
		},
		tls: {
			rejectUnauthorized: false
		}
	});
}

const sendErrorEmail = (order, body) => {
	const transport = setup();
	const email = {
		from,
		to: 'jsams@mmt.com',
		subject: `${order} - Error processing file`,
		text: body,
	};

	transport.sendMail(email);
	logger.info(`${order} email has been sent`);
};

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
	.on('add', path => {
		try {
			const filename = path.split('/').pop();

			logger.info(`${filename} has encountered an error`);
			sendErrorEmail(`${filename}`, 'Error file has appeared in _keyline/error');
		} catch (error) {
			loggerError.error(err);
		}
	});
