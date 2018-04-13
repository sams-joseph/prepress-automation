import fs from 'fs';
import chokidar from 'chokidar';
import winston from 'winston';
import axios from 'axios';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import parser from 'xml2json';
dotenv.config();

const inputFolder = '/Volumes/G33STORE/_callas_server/_preflight/error';
const processedFolder = '/Volumes/G33STORE/_callas_server/_preflight/processed';
const logPath = '/Volumes/G33STORE/_Hotfolders/Logs';

const from = '"Joseph Sams" <jsams@mmt.com>';

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

const logger = new winston.Logger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      timestamp: true
    }),
    new winston.transports.File({
      filename: `${logPath}/preflight.log`,
      timestamp: true
    })
  ]
});

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

const sendPreflightEmail = (order, issues) => {
  const transport = setup();
  const email = {
    from,
    to: 'jsams@mmt.com',
    subject: `${order} - Possible preflight issues`,
    text: issues,
  };

  transport.sendMail(email);
  logger.info(`${order} email has been sent`);
};

function parseReport(path, order) {
  fs.readFile(path, (err, data) => {
    if (err) loggerError.error(err);
    const json = parser.toJson(data);
    const jsonParse = JSON.parse(json);
    const results = Array.isArray(jsonParse.report.results.hits) ? jsonParse.report.results.hits : [jsonParse.report.results.hits];
    const rules = jsonParse.report.profile_info.rules.rule;
    const message = [];

    logger.info(`${path} has been added to parse flow`);

    for (let i = 0; i < results.length; i++) {
      for (let x = 0; x < rules.length; x++) {
        if (results[i].rule_id === rules[x].id) {
          message.push(results[i].severity);
          message.push('\n');
          message.push(rules[x].display_name);
          message.push('\n');
          message.push(rules[x].display_comment);
          message.push('\n');
          message.push('\n');
        }
      }
    }

    const formattedMessage = message.join('');
    console.log(formattedMessage);
    // sendPreflightEmail(order, formattedMessage);
  });
}

const watcher = chokidar.watch(inputFolder, {
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
    const xmlReport = `${jobNumber}P${partNumber}_report.xml`
    if (filename === xmlReport) {
      parseReport(`${inputFolder}/${xmlReport}`, `${jobNumber}P${partNumber}`);
    }

    fs.rename(path, `${processedFolder}/${filename}`, error => {
      if (error) loggerError.error(error);
    });
  });