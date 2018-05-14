import Client from 'ftp';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

let processing = false;

const download = () => {
  const c = new Client();
  const inputFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';

  c.on('greeting', function () {
    console.log('Connected to FTP server');
  });

  c.on('ready', function () {
    processing = true;

    console.log('Successfully authenticated');
    c.list('/clearchannel', (err, list) => {
      if (err) console.log(err);
      list.forEach((element, index, array) => {
        if (element.type === 'd') {
          console.log(`Ignoring directory ${element.name}`);
          return;
        }

        if (path.extname(element.name) === '.zip') {
          console.log(`Ignoring file ${element.name}`);
          return;
        }

        if (element.name.indexOf('anonymous') > -1) {
          console.log(`Ignoring file ${element.name}`);
          return;
        }

        if (path.extname(element.name) === '.jpg' ||
          path.extname(element.name) === '.jpeg' ||
          path.extname(element.name) === '.pdf' ||
          path.extname(element.name) === '.tif' ||
          path.extname(element.name) === '.gif' ||
          path.extname(element.name) === '.png') {
          console.log(`Downloading ${element.name}`);
          c.get(`/clearchannel/${element.name}`, (err, stream) => {
            if (err) console.log(err);
            stream.once('close', () => {
              c.rename(`/clearchannel/${element.name}`, `/clearchannel/downloaded/${element.name}`, (err) => {
                if (err) console.log(err);
              })
            });
            stream.pipe(fs.createWriteStream(`${inputFolder}/${element.name}`))
          });
        }
      });
    });

    c.end();
  });

  c.on('close', function () {
    console.log('Closed connection');
    processing = false;
  });


  c.connect({
    host: process.env.UPLOAD_HOST,
    user: process.env.UPLOAD_USER,
    password: process.env.UPLOAD_PASS,
  });
}

setInterval(() => {
  if (!processing) {
    download();
  }
}, 60000);

export default download;