const Client = require('ftp');
const axios = require('axios');
const fs = require('fs');
const chokidar = require('chokidar');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
dotenv.config();

const inputFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';
const outputFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/Success';
const imageFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/_image_export/Success';
const processedFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/UPLOADED';
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
    subject: `${order} - Error changing status`,
    text: body,
  };

  transport.sendMail(email);
  console.log(`${order} email has been sent`);
};

const watcher = chokidar.watch(outputFolder, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

watcher
  .on('add', path => {
    const c = new Client();
    const filename = path.split('/').pop();
    const extension = filename.split('.')[1];
    const quoteNumber = filename.substring(0, 5);
    const partNumber = filename.substring(6, 8);
    const action = 'proofapproval';
    console.log('File added to upload directory');

    c.on('greeting', function () {
      console.log('Connected to FTP server');
    });

    c.on('ready', function () {
      console.log('Successfully authenticated');
      c.put(path, `Q${quoteNumber}P${partNumber}.${extension}`, function (err) {
        if (err) throw err;
        console.log(`Uploaded Q${quoteNumber}P${partNumber}.${extension}`);
        axios.get(
          `http://buildnserv.com/pace/www/api?token=OsGHJd3Bxt&quote=${quoteNumber}&part=${partNumber}&action=${action}`
        )
          .then(res => {
            if (res.data.status) {
              console.log(res.data.message);
              fs.rename(path, `${processedFolder}/${quoteNumber}P${partNumber}.${extension}`, error => {
                if (error) console.log(error);
                console.log(`Moved Q${quoteNumber}P${partNumber}.${extension} to processed`);
              });
            } else {
              sendPreflightEmail(`Q${quoteNumber}P${partNumber}`, `Failed to move the status of Q${quoteNumber}P${partNumber} to Proof Approval`);
            }
          })
          .catch(err => {
            console.log(err.error);
            sendPreflightEmail(`Q${quoteNumber}P${partNumber}`, `Failed to move the status of Q${quoteNumber}P${partNumber} to Proof Approval`);
          });

        c.end();
      });
    });

    c.on('close', function () {
      console.log('Closed connection');
    });

    c.connect({
      host: process.env.SPROOF_HOST,
      user: process.env.SPROOF_USER,
      password: process.env.SPROOF_PASS,
    });
  });


const imageWatcher = chokidar.watch(imageFolder, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: true,
  persistent: true
});

imageWatcher
  .on('add', path => {
    const c = new Client();
    const filename = path.split('/').pop();
    const extension = filename.split('.')[1];
    const quoteNumber = filename.substring(0, 5);
    const partNumber = filename.substring(6, 8);
    console.log('File added to upload directory');

    c.on('greeting', function () {
      console.log('Connected to FTP server');
    });

    c.on('ready', function () {
      console.log('Successfully authenticated');
      c.put(path, `Q${quoteNumber}P${partNumber}.${extension}`, function (err) {
        if (err) throw err;
        console.log(`Uploaded Q${quoteNumber}P${partNumber}.${extension}`);
        fs.rename(path, `${processedFolder}/${quoteNumber}P${partNumber}.${extension}`, error => {
          if (error) throw error;
          console.log(`Moved Q${quoteNumber}P${partNumber}.${extension} to processed`);
        });
        c.end();
      });
    });

    c.on('close', function () {
      console.log('Closed connection');
    });

    c.connect({
      host: process.env.SPROOF_HOST,
      user: process.env.SPROOF_USER,
      password: process.env.SPROOF_PASS,
    });
  });