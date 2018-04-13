import fs from 'fs';
import chokidar from 'chokidar';
import winston from 'winston';
import axios from 'axios';

const hotfolderPath = '/Volumes/G33STORE/_Hotfolders/Input/keyline';
const processedPath = '/Volumes/G33STORE/_callas_server/_keyline/success';
const keylineOutput = '/Volumes/G33STORE/_Hotfolders/Output/keyline';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';
const JSONPath = '/Volumes/G33STORE/_callas_server/_keyline/JSON_sidecar';
const WIPPath = '/Volumes/G33STORE/WIP';
const epsonHotfolderPath = '/Volumes/G33STORE/_Hotfolders/Input/epson';
const epsonInputPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_pre-scale/input';
const epsonPDFPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_export tiff/processed';
const epsonTIFFPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_export tiff/success';
const csrRepositoryPath = '/Volumes/G33STORE/_Hotfolders/Input/csr_repository';

const keylineLog = new winston.Logger({
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

const epsonLog = new winston.Logger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      timestamp: true
    }),
    new winston.transports.File({
      filename: `${logPath}/epson.log`,
      timestamp: true
    })
  ]
});

const WIPLog = new winston.Logger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      timestamp: true
    }),
    new winston.transports.File({
      filename: `${logPath}/wip.log`,
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

    keylineLog.info(`${jobNumber}P${partNumber} has been added to input queue`);

    axios
      .get(`https://orders.mmt.com/api/?job=${jobNumber}&part=${partNumber}&token=OsGHJd3Bxt`)
      .then(result => {
        const {
          job,
          jobPart,
          jobMaterials,
          jobNotes,
          jobPartItems,
        } = result.data;

        let bleedWidth = jobPart.U_trimSizeWidth;
        let bleedHeight = jobPart.U_trimSizeLength;

        for (let i = 0; i < jobPartItems.length; i++) {
          if (jobPartItems[i].name === "SSP Lind" || jobPartItems[i].name === "SSP Lamar" || jobPartItems[i].name === "SSP Formetco" || jobPartItems[i].name === "SSP CCO/OFM (125\" x 272\") Name") {
            bleedWidth = Math.round(jobPart.finalSizeW * 100) / 100;
            bleedHeight = Math.round(jobPart.finalSizeH * 100) / 100;
            break;
          } else if (jobPartItems[i].name === "Bulletin 14' x 48'") {
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

          keylineLog.info(`${jobNumber}P${partNumber} sidecar JSON file has been created`);

          fs.rename(path, `${processedPath}/${jobNumber}P${partNumber}vis.${extension}`, error => {
            if (error) loggerError.error(error);

            keylineLog.info(`${jobNumber}P${partNumber} has been moved to keyline folder`);
          });
        });
      })
      .catch(err => {
        loggerError.error(err);
      });
  });

const keylineOutWatcher = chokidar.watch(keylineOutput, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

keylineOutWatcher
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.substring(0, 6);
    const partNumber = filename.substring(7, 9);
    const extension = filename.split('.')[1];

    keylineLog.info(`${jobNumber}P${partNumber} has been added to output queue`);

    fs.copyFile(path, `${WIPPath}/${jobNumber}P${partNumber}/prep_art/${jobNumber}P${partNumber}vis.${extension}`, err => {
      if (err) loggerError.error(err);

      WIPLog.info(`${jobNumber}P${partNumber} has been copied to WIP folder`);

      fs.rename(path, `${epsonHotfolderPath}/${jobNumber}P${partNumber}.${extension}`, error => {
        if (error) loggerError.error(error);

        keylineLog.info(`${jobNumber}P${partNumber} has been moved to epson input folder`);
      });
    });
  });

const epsonWatcher = chokidar.watch(epsonHotfolderPath, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

epsonWatcher
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.substring(0, 6);
    const partNumber = filename.substring(7, 9);
    const extension = filename.split('.')[1];

    epsonLog.info(`${jobNumber}P${partNumber} has been added to input queue`);

    fs.copyFile(path, `${csrRepositoryPath}/${jobNumber}P${partNumber}.${extension}`, err => {
      if (err) loggerError.error(err);

      epsonLog.info(`${jobNumber}P${partNumber} has been copied to CSR repository folder`);

      fs.rename(path, `${epsonInputPath}/${jobNumber}P${partNumber}.${extension}`, error => {
        if (error) loggerError.error(error);

        epsonLog.info(`${jobNumber}P${partNumber} has been moved to epson folder`);
      });
    });
  });

const epsonPDFwatcher = chokidar.watch(epsonPDFPath, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

epsonPDFwatcher
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.substring(0, 6);
    const partNumber = filename.substring(7, 9);
    const extension = filename.split('.')[1];

    WIPLog.info(`${jobNumber}P${partNumber} has been added to epson PDF output queue`);

    fs.rename(path, `${WIPPath}/${jobNumber}P${partNumber}/prep_art/LOW/${jobNumber}P${partNumber}.${extension}`, error => {
      if (error) loggerError.error(error);

      WIPLog.info(`${jobNumber}P${partNumber}.${extension} has been moved to WIP folder`);
    });
  });

const epsonTIFFwatcher = chokidar.watch(epsonTIFFPath, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

epsonTIFFwatcher
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.substring(0, 6);
    const partNumber = filename.substring(7, 9);
    let extension = filename.split('.')[1];

    if (extension === 'tiff') extension = 'tif';

    WIPLog.info(`${jobNumber}P${partNumber} has been added to epson tif output queue`);

    fs.rename(path, `${WIPPath}/${jobNumber}P${partNumber}/prep_art/LOW/${jobNumber}P${partNumber}.${extension}`, error => {
      if (error) loggerError.error(error);

      WIPLog.info(`${jobNumber}P${partNumber}.${extension} has been moved to WIP folder`);
    });
  });