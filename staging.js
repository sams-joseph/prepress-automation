import fs from 'fs';
import chokidar from 'chokidar';
import winston from 'winston';
import axios from 'axios';

const hotfolderPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';
const processedPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/In';
const keylineOutput = '/Volumes/G33STORE/_Hotfolders/Output/keyline';
const epsonHotfolderPath = '/Volumes/G33STORE/_Hotfolders/Input/epson';
const logPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/LOGS';
const JSONPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/JSON_sidecar';
const WIPPath = '/Volumes/G33STORE/WIP';

const logger = new winston.Logger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      timestamp: true
    }),
    new winston.transports.File({
      filename: `${logPath}/keyline.log`,
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

const watcher = chokidar.watch(hotfolderPath, {
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
      .get(`http://buildnserv.com/pace/www/api/?job=${jobNumber}&part=${partNumber}&token=OsGHJd3Bxt`)
      .then(result => {
        const {
          job,
          jobPart,
          jobMaterials,
          jobNotes,
          jobPartItems,
        } = result.data;

        let bleedWidth = jobPart.U_flatSizeWidth;
        let bleedHeight = jobPart.U_flatSizeLength;

        for (let i = 0; i < jobPartItems.length; i++) {
          if (jobPartItems[i].name === "SSP Lind") {
            bleedWidth = Math.round(272 * 100) / 100;
            bleedHeight = Math.round(125 * 100) / 100;
            break;
          } else if (jobPartItems[i].name === "SSP Lamar") {
            bleedWidth = Math.round(273.5 * 100) / 100;
            bleedHeight = Math.round(126.5 * 100) / 100;
            break;
          } else if (jobPartItems[i].name === "SSP Formetco") {
            bleedWidth = Math.round(273 * 100) / 100;
            bleedHeight = Math.round(126 * 100) / 100;
            break;
          } else if (jobPartItems[i].name === "SSP CCO/OFM (125\" x 272\") Name") {
            bleedWidth = Math.round(272 * 100) / 100;
            bleedHeight = Math.round(125 * 100) / 100;
            break;
          } else if (jobPartItems[i].name === "Bulletin 14' x 48'" && jobPart.finalSizeW === 576) {
            bleedWidth = 588;
            break;
          }
        }

        const json = {
          "visibleHeight": jobPart.finalSizeH,
          "visibleWidth": jobPart.finalSizeW,
          "bleedHeight": bleedHeight,
          "bleedWidth": bleedWidth,
          "description": jobPart.description,
          "orderNumber": job.job,
          "partNumber": jobPart.jobPart,
        }

        fs.writeFile(`${JSONPath}/${jobNumber}P${partNumber}vis.json`, JSON.stringify(json), 'utf8', (err) => {
          if (err) loggerError.error(error);

          logger.info(`${jobNumber}P${partNumber} sidecar JSON file has been created`);

          fs.rename(path, `${processedPath}/${jobNumber}P${partNumber}vis.${extension}`, error => {
            if (error) loggerError.error(error);

            logger.info(`${jobNumber}P${partNumber} has been moved to keyline folder`);
          });
        });
      })
      .catch(err => {
        loggerError.error(err);
      });
  });
