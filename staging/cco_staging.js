const fs = require('fs');
const chokidar = require('chokidar');
const winston = require('winston');
const axios = require('axios');
const productItems = require('../product-items.json');

const clientFiles = '/Volumes/ClientUploads/tFlow/BuildNServ';
const hotfolderPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';
const processedPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/_keyline/In';
const keylineOutput = '/Volumes/G33STORE/_Hotfolders/Output/keyline';
const epsonHotfolderPath = '/Volumes/G33STORE/_Hotfolders/Input/epson';
const logPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/LOGS';
const JSONPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/JSON_sidecar';
const keylineErrorPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/_keyline/Error';
const uploadPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/Success';
const errorImage = './images/error_file.jpg';
const errorPDF = './images/error_file.pdf';
const processedErrorsPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/_processed_errors';
const WIPPath = '/Volumes/G33STORE/WIP';
const from = '"MMT Preflight" <no-reply@mmt.com>';

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
    const originalName = path.split('/').pop();
    try {
      let filename = path.split('/').pop();

      if (filename[0] === 'Q') {
        filename = filename.slice(1);
      }

      let extension = filename.split('.')[1];
      let noExtension = filename.split('.')[0];
      let quoteNumber = filename.substring(0, 5);
      let partNumber = filename.substring(6, 8);

      if (filename[0] === '5') {
        quoteNumber = filename.substring(0, 6);
        partNumber = filename.substring(7, 9);
        extension = filename.split('.')[1];
      }

      const query = filename[0] === 'Q' || filename[0] === '1' || filename[0] === '2' ? 'quote' : 'job';

      logger.info(`${quoteNumber}P${partNumber} has been added to input queue`);

      fs.copyFile(path, `${clientFiles}/${originalName}`, err => {

        axios
          .get(`https://orders.mmt.com/api?token=OsGHJd3Bxt&${query}=${quoteNumber}&part=${partNumber}`)
          .then(result => {
            if (query === 'quote') {
              createSidecarQuote(result, extension, noExtension, quoteNumber, partNumber, path);
            } else if (query === 'job') {
              createSidecarJob(result, extension, quoteNumber, partNumber, path);
            }
          })
          .catch(err => {
            loggerError.error(err);
          });

      });
    } catch (error) {
      loggerError.error(err);
    }
  });

// const errorWatcher = chokidar.watch(keylineErrorPath, {
//   ignored: /(^|[\/\\])\../,
//   awaitWriteFinish: true,
//   persistent: true
// });

// errorWatcher
//   .on('add', path => {
//     try {
//       let filename = path.split('/').pop();

//       if (filename[0] === 'Q') {
//         filename = filename.slice(1);
//       }

//       let extension = filename.split('.')[1];
//       let noExtension = filename.split('.')[0];
//       let quoteNumber = filename.substring(0, 5);
//       let partNumber = filename.substring(6, 8);

//       if (filename[0] === '5') {
//         quoteNumber = filename.substring(0, 6);
//         partNumber = filename.substring(7, 9);
//         extension = filename.split('.')[1];
//       }

//       const query = filename[0] === 'Q' || filename[0] === '1' ? 'quote' : 'job';
//       const action = 'proofapproval';
//       const message = encodeURIComponent('We have encountered an error while processing your file.');

//       logger.info(`${quoteNumber}P${partNumber} has ecountered an error`);
//       axios
//         .get(`https://orders.mmt.com/api?token=OsGHJd3Bxt&${query}=${quoteNumber}&part=${partNumber}&action=${action}&message=${message}&error=true`)
//         .then(result => {
//           logger.info(result.data.message);
//           fs.rename(path, `${processedErrorsPath}/${quoteNumber}P${partNumber}.${extension}`, error => {
//             if (error) loggerError.error(error);

//             logger.info(`${quoteNumber}P${partNumber} has been moved to error processed folder`);
//           });
//         })
//         .catch(err => {
//           loggerError.error(err);
//         });
//     } catch (error) {
//       loggerError.error(err);
//     }
//   });


function createSidecarQuote(result, extension, noExtension, quoteNumber, partNumber, path) {
  const {
    quote,
    quoteProduct
  } = result.data;

  let dims = {};

  if (quoteProduct.productItem === 5886 || quoteProduct.productItem === 6299 || quoteProduct.productItem === 6000) {
    dims = {
      "visibleHeight": quoteProduct.U_CustomHeight,
      "visibleWidth": quoteProduct.U_CustomWidth,
      "bleedHeight": quoteProduct.U_CustomHeight + 12,
      "bleedWidth": quoteProduct.U_CustomWidth + 12,
    }
  } else if (quoteProduct.productItem === 6420) {
    dims = {
      "visibleHeight": quoteProduct.U_CustomHeight,
      "visibleWidth": quoteProduct.U_CustomWidth,
      "bleedHeight": quoteProduct.U_CustomHeight + 4,
      "bleedWidth": quoteProduct.U_CustomWidth + 4,
    }
  } else if (quoteProduct.productItem === 5025 ||
    quoteProduct.productItem === 5039 ||
    quoteProduct.productItem === 6307 ||
    quoteProduct.productItem === 6269 ||
    quoteProduct.productItem === 5075) {
    dims = {
      "visibleHeight": quoteProduct.U_CustomHeight,
      "visibleWidth": quoteProduct.U_CustomWidth,
      "bleedHeight": quoteProduct.U_CustomHeight,
      "bleedWidth": quoteProduct.U_CustomWidth,
    }
  } else {
    dims = {
      ...productItems[quoteProduct.productItem]
    };
  }

  const json = {
    "visibleHeight": dims.visibleHeight,
    "visibleWidth": dims.visibleWidth,
    "bleedHeight": dims.bleedHeight,
    "bleedWidth": dims.bleedWidth,
    "description": quoteProduct.description,
    "orderNumber": "Pending",
    "partNumber": partNumber,
  }

  fs.writeFile(`${JSONPath}/${quoteNumber}P${partNumber}vis.json`, JSON.stringify(json), 'utf8', (err) => {
    if (err) loggerError.error(error);

    logger.info(`${quoteNumber}P${partNumber} sidecar JSON file has been created`);

    fs.rename(path, `${processedPath}/${quoteNumber}P${partNumber}vis.${extension}`, error => {
      if (error) loggerError.error(error);

      logger.info(`${quoteNumber}P${partNumber} has been moved to keyline folder`);
    });
  });
}


function createSidecarJob(result, extension, jobNumber, partNumber, path) {
  console.log(jobNumber, partNumber);
  const {
    job,
    jobPart,
    jobMaterials,
    jobNotes,
    jobPartItems,
  } = result.data;

  let bleedWidth = jobPart.U_flatSizeWidth ? jobPart.U_flatSizeWidth : 0;
  let bleedHeight = jobPart.U_flatSizeLength ? jobPart.U_flatSizeLength : 0;

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
}