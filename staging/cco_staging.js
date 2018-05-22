const fs = require('fs');
const chokidar = require('chokidar');
const nodemailer = require('nodemailer');
const winston = require('winston');
const axios = require('axios');
const productItems = require('../product-items.json');

const hotfolderPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';
const processedPath = '/Volumes/G33STORE/_callas_server/BNS_STAGING/_keyline/in_t';
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

const sendPreflightEmail = (order, body) => {
  const transport = setup();
  const email = {
    from,
    to: 'jsams@mmt.com',
    subject: `${order} - Error processing file`,
    text: body,
  };

  transport.sendMail(email);
  console.log(`${order} email has been sent`);
};

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
    try {
      let filename = path.split('/').pop();

      if (filename[0] === 'Q') {
        filename = filename.slice(1);
      }

      const extension = filename.split('.')[1];
      const noExtension = filename.split('.')[0];
      const quoteNumber = filename.substring(0, 5);
      const partNumber = filename.substring(6, 8);

      logger.info(`${quoteNumber}P${partNumber} has been added to input queue`);
      axios
        .get(`http://buildnserv.com/pace/www/api?token=OsGHJd3Bxt&quote=${quoteNumber}&part=${partNumber}`)
        .then(result => {
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
        })
        .catch(err => {
          loggerError.error(err);
        });
    } catch (error) {
      loggerError.error(err);
    }
  });

const errorWatcher = chokidar.watch(keylineErrorPath, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

errorWatcher
  .on('add', path => {
    try {
      const filename = path.split('/').pop();
      const extension = filename.split('.')[1];
      const noExtension = filename.split('.')[0];
      const quoteNumber = filename.substring(0, 5);
      const partNumber = filename.substring(6, 8);
      const action = 'proofapproval';
      const message = encodeURIComponent('We have encountered an error while processing your file.');

      logger.info(`${quoteNumber}P${partNumber} has ecountered an error`);
      sendPreflightEmail(`${quoteNumber}P${partNumber}`, `${quoteNumber}P${partNumber} has ecountered an error`);
      axios
        .get(`http://buildnserv.com/pace/www/api?token=OsGHJd3Bxt&quote=${quoteNumber}&part=${partNumber}&action=${action}&error=${message}`)
        .then(result => {
          logger.info(result.data.message);
          fs.rename(path, `${processedErrorsPath}/${quoteNumber}P${partNumber}.${extension}`, error => {
            if (error) loggerError.error(error);

            logger.info(`${quoteNumber}P${partNumber} has been moved to error processed folder`);
          });
        })
        .catch(err => {
          loggerError.error(err);
          sendPreflightEmail(`${quoteNumber}P${partNumber}`, `${quoteNumber}P${partNumber} encountered an error when updating PACE status`);
        });
    } catch (error) {
      loggerError.error(err);
    }
  });