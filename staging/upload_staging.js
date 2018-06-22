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

    const query = filename[0] === 'Q' || filename[0] === '1' ? 'quote' : 'job';
    const action = 'proofapproval';
    console.log('File added to upload directory');

    c.on('greeting', function () {
      console.log('Connected to FTP server');
    });

    c.on('ready', function () {
      console.log('Successfully authenticated');
      const order = quoteNumber[0] === '5' ? quoteNumber : `Q${quoteNumber}`;
      c.put(path, `${order}P${partNumber}.${extension}`, function (err) {
        if (err) throw err;
        console.log(`Uploaded ${order}P${partNumber}.${extension}`);
        axios.get(
          `https://orders.mmt.com/api?token=OsGHJd3Bxt&${query}=${quoteNumber}&part=${partNumber}&action=${action}`
        )
          .then(res => {
            if (res.data.status) {
              console.log(res.data.message);
              fs.rename(path, `${processedFolder}/${quoteNumber}P${partNumber}.${extension}`, error => {
                if (error) console.log(error);
                console.log(`Moved Q${quoteNumber}P${partNumber}.${extension} to processed`);
              });
            } else {
            }
          })
          .catch(err => {
            console.log(err.error);
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

    console.log('File added to upload directory');

    c.on('greeting', function () {
      console.log('Connected to FTP server');
    });

    c.on('ready', function () {
      const order = quoteNumber[0] === '5' ? quoteNumber : `Q${quoteNumber}`;
      console.log('Successfully authenticated');
      c.put(path, `${order}P${partNumber}.${extension}`, function (err) {
        if (err) throw err;
        console.log(`Uploaded ${order}P${partNumber}.${extension}`);
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
      host: process.env.PROOF_HOST,
      user: process.env.PROOF_USER,
      password: process.env.PROOF_PASS,
    });
  });