const fs = require('fs');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TOKEN = process.env.TOKEN;

const hotfolderPath = '/Volumes/G33STORE/_Hotfolders/Input/production';
const ccoPePath = '/Volumes/G33STORE/_callas_server/_production/_cco_pe/In';
const bulletinPath = '/Volumes/G33STORE/_callas_server/_production/_14x48/In';
const bulletinOutPath = '/Volumes/G33STORE/_callas_server/_production/_14x48/Success';
const standardPath = '/Volumes/G33STORE/_callas_server/_production/_standard/In';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';
const JSONPath = '/Volumes/G33STORE/_callas_server/_keyline/JSON_sidecar';
const WIPPath = '/Volumes/G33STORE/WIP';

const logger = new winston.Logger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      timestamp: true
    }),
    new winston.transports.File({
      filename: `${logPath}/production.log`,
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
      .get(`https://orders.mmt.com/api/?job=${jobNumber}&part=${partNumber}&token=${TOKEN}`)
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
        });
        let count = 0;

        for (let i = 0; i < jobPartItems.length; i++) {
          if (jobPartItems[i].name === "SSP Lind") {

            break;
          } else if (jobPartItems[i].name === "SSP Lamar") {

            break;
          } else if (jobPartItems[i].name === "SSP Formetco") {

            break;
          } else if (jobPartItems[i].name === "SSP CCO/OFM (125\" x 272\") Name") {
            fs.rename(path, `${ccoPePath}/${jobNumber}P${partNumber}.${extension}`, error => {
              if (error) loggerError.error(error);

              logger.info(`${jobNumber}P${partNumber} has been moved to CCO PE folder`);
            });
            break;
          } else if (jobPartItems[i].name === "Bulletin 14' x 48'" || jobPartItems[i].name === "Bulletin Matan 14' x 48'") {
            fs.rename(path, `${bulletinPath}/${jobNumber}P${partNumber}.${extension}`, error => {
              if (error) loggerError.error(error);

              logger.info(`${jobNumber}P${partNumber} has been moved to 14x48 folder`);
            });
            break;
          }

          count += 1;

          if (count === jobPartItems.length) {
            fs.rename(path, `${standardPath}/${jobNumber}P${partNumber}.${extension}`, error => {
              if (error) loggerError.error(error);

              logger.info(`${jobNumber}P${partNumber} has been moved to standard folder`);
            });
          }
        }
      })
      .catch(err => {
        loggerError.error(err);
      });
  });


const bulletinProductionSuccess = chokidar.watch(bulletinOutPath, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

bulletinProductionSuccess
  .on('add', path => {
    const wip = '/Volumes/G33STORE/WIP';
    const filename = path.split('/').pop();
    const extension = filename.split('.')[1];
    const jobNumber = filename.substring(0, 9);

    fs.rename(path, `${wip}/${jobNumber}/paint_files/${jobNumber}xp10_mil.${extension}`, () => {
      console.log(`${jobNumber} moved to WIP`);
    })
  });