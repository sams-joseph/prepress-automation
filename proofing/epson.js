const fs = require('fs');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TOKEN = process.env.TOKEN;

const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';
const JSONPath = '/Volumes/G33STORE/_callas_server/_keyline/JSON_sidecar';
const WIPPath = '/Volumes/G33STORE/WIP';
const epsonHotfolderPath = '/Volumes/G33STORE/_Hotfolders/Input/epson';
const epsonInputPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_pre-scale/input';
const epsonPDFPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_export tiff/processed';
const epsonTIFFPath = '/Volumes/G33STORE/_callas_server/_epson/_epson_export tiff/success';
const csrRepositoryPath = '/Volumes/G33STORE/_Hotfolders/Input/csr_repository';
const approvalStaging = '/Volumes/G33STORE/_callas_server/_staging/approval_sheet';
const approvalSheetPath = '/Volumes/G33STORE/_callas_server/_approval_sheet/Input_3';
const primaryPdfInPath = '/Volumes/G33STORE/_callas_server/_primary/_primary_pre-scale_pdf_for_image/In';
const primaryStaging = '/Volumes/G33STORE/_callas_server/_staging/primary_pdf';

const logger = new winston.Logger({
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

          fs.copyFile(path, `${approvalStaging}/${jobNumber}P${partNumber}.${extension}`, err => {
            if (err) loggerError.error(err);
            logger.info(`${jobNumber}P${partNumber} has been copied to Approval Sheet staging`);

            fs.copyFile(path, `${primaryStaging}/${jobNumber}P${partNumber}.${extension}`, copyError => {
              if (copyError) loggerError.error(copyError);
              logger.info(`${jobNumber}P${partNumber} has been copied to primary PDF staging`);

              fs.rename(path, `${epsonInputPath}/${jobNumber}P${partNumber}.${extension}`, error => {
                if (error) loggerError.error(error);

                logger.info(`${jobNumber}P${partNumber} has been moved to epson folder`);
              });
            });
          });
        });
      })
      .catch(err => {
        loggerError.error(err);
      });
  });

const approvalStagingWatcher = chokidar.watch(approvalStaging, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

approvalStagingWatcher
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.substring(0, 6);
    const partNumber = filename.substring(7, 9);
    const extension = filename.split('.')[1];

    logger.info(`${jobNumber}P${partNumber} has been added to approval sheet staging`);

    fs.rename(path, `${approvalSheetPath}/${jobNumber}P${partNumber}.${extension}`, error => {
      if (error) loggerError.error(error);

      logger.info(`${jobNumber}P${partNumber}.${extension} has been moved to approval input`);
    });
  });

const primaryPDFstaging = chokidar.watch(primaryStaging, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

primaryPDFstaging
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.substring(0, 6);
    const partNumber = filename.substring(7, 9);
    const extension = filename.split('.')[1];

    logger.info(`${jobNumber}P${partNumber} has been added to primary PDF staging`);

    fs.rename(path, `${primaryPdfInPath}/${jobNumber}P${partNumber}.${extension}`, error => {
      if (error) loggerError.error(error);

      logger.info(`${jobNumber}P${partNumber}.${extension} has been moved to primary PDF input`);
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

    logger.info(`${jobNumber}P${partNumber} has been added to epson PDF output queue`);

    fs.rename(path, `${WIPPath}/${jobNumber}P${partNumber}/prep_art/LOW/${jobNumber}P${partNumber}.${extension}`, error => {
      if (error) loggerError.error(error);

      logger.info(`${jobNumber}P${partNumber}.${extension} has been moved to WIP folder`);
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

    logger.info(`${jobNumber}P${partNumber} has been added to epson tif output queue`);

    fs.rename(path, `${WIPPath}/${jobNumber}P${partNumber}/prep_art/LOW/${jobNumber}P${partNumber}.${extension}`, error => {
      if (error) loggerError.error(error);

      logger.info(`${jobNumber}P${partNumber}.${extension} has been moved to WIP folder`);
    });
  });