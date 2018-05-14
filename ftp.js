import Client from 'ftp';
import fs from 'fs';
import chokidar from 'chokidar';
import dotenv from 'dotenv';
dotenv.config();

const inputFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';
const outputFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/Success';
const imageFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/_image_export/Success';
const processedFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/UPLOADED';
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
          if (error) console.log(error);
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
      host: process.env.PROOF_HOST,
      user: process.env.PROOF_USER,
      password: process.env.PROOF_PASS,
    });
  });