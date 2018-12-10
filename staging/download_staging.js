const Client = require('ftp');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

const TOKEN = process.env.TOKEN;

let processing = false;

const download = () => {
  const c = new Client();
  const inputFolder = '/Volumes/G33STORE/_callas_server/BNS_STAGING/input';

  c.on('greeting', function () {
    // console.log('Connected to FTP server');
  });

  c.on('ready', function () {
    processing = true;

    // console.log('Successfully authenticated');
    c.list('/clearchannel', (err, list) => {
      if (err) console.log(err);
      list.forEach((element, index, array) => {
        if (element.type === 'd') {
          // console.log(`Ignoring directory ${element.name}`);
          return;
        }

        if (path.extname(element.name) === '.zip') {
          // console.log(`Ignoring file ${element.name}`);
          const orderPart = path.basename(element.name, path.extname(element.name));
          const part = orderPart.substring(orderPart.length - 2, orderPart.length);
          let order = '';
          if (orderPart[0] === '5') {
            order = orderPart.substring(0, 6);
          } else if (orderPart[0] === 'Q') {
            order = orderPart.substring(1, 6);
          } else {
            order = orderPart.substring(0, 5);
          }
          const query = order[0] === 'Q' || order[0] === '1' ? 'quote' : 'job';

          const action = 'proofapproval';
          const message = encodeURIComponent('Manually reviewing file.');

          c.rename(`/clearchannel/${element.name}`, `/clearchannel/downloaded/${element.name}`, (err) => {
            if (err) console.log(err);
            axios
              .get(`https://orders.mmt.com/api?token=${TOKEN}&${query}=${order}&part=${part}&action=${action}&message=${message}&error=true`)
              // .get(`http://buildnserv.com/pace/www/api?token=${TOKEN}&${query}=${order}&part=${part}&action=${action}&message=${message}&error=true`)
              .then(result => {
                console.log(result.data);
              })
              .catch(err => {
                console.log(err);
              });
          });

          return;
        }

        if (element.name.indexOf('anonymous') > -1) {
          // console.log(`Ignoring file ${element.name}`);
          return;
        }

        if (path.extname(element.name) === '.jpg' ||
          path.extname(element.name) === '.JPG' ||
          path.extname(element.name) === '.jpeg' ||
          path.extname(element.name) === '.JPEG' ||
          path.extname(element.name) === '.pdf' ||
          path.extname(element.name) === '.PDF' ||
          path.extname(element.name) === '.tif' ||
          path.extname(element.name) === '.TIF' ||
          path.extname(element.name) === '.gif' ||
          path.extname(element.name) === '.GIF' ||
          path.extname(element.name) === '.png' ||
          path.extname(element.name) === '.PNG') {
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
    // console.log('Closed connection');
    processing = false;
  });


  c.connect({
    host: process.env.UPLOAD_LIVE_HOST,
    user: process.env.UPLOAD_LIVE_USER,
    password: process.env.UPLOAD_LIVE_PASS,
  });
}

setInterval(() => {
  if (!processing) {
    download();
  }
}, 300000);