const fs = require('fs');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');

const inputPath = '/Volumes/G33STORE/_tFlow_Hotfolders/csr_repository/rapport_crazy_proof_input';
const outputPath = '/Volumes/G33STORE/_tFlow_Hotfolders/csr_repository/rapport_crazy_proof_output';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';

const logger = new winston.Logger({
	level: 'verbose',
	transports: [
		new winston.transports.Console({
			timestamp: true
		}),
		new winston.transports.File({
			filename: `${logPath}/rename_proofs.log`,
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
		const filename = path.split('/').pop();
		const jobNumber = filename.substring(0, 6);
		const partNumber = filename.substring(7, 9);
		const extension = filename.split('.')[1];

		logger.info(`${jobNumber}P${partNumber} has been added to input queue`);

		axios
			.get(`https://orders.mmt.com/api/?job=${jobNumber}&part=${partNumber}&token=OsGHJd3Bxt`)
			.then(result => {
				const {
					jobPart,
				} = result.data;

				fs.rename(path, `${outputPath}/${jobPart.description}-${jobNumber}P${partNumber}.${extension}`, error => {
					if (error) loggerError.error(error);

					logger.info(`${jobNumber}P${partNumber} has been moved to output folder`);
				});
			})
			.catch(err => {
				loggerError.error(err);
			});
	});
