import im from 'imagemagick';
import fs from 'fs';
import chokidar from 'chokidar';
import winston from 'winston';

const hotfolderPath = './hotfolder/input/tifs';
// TODO: Link with live hotfolder in WIP
// const hotfolderPath = '/Volumes/G33STORE/_tFlow_Hotfolders/tFlow Hotfolders/Input/23_Proof_Low';

const logger = new winston.Logger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      timestamp: true
    }),
    new winston.transports.File({
      filename: 'logs/app.log',
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
      filename: 'logs/app-errors.log',
      timestamp: true
    })
  ]
});

const watcher = chokidar.watch(hotfolderPath, {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

watcher
  .on('add', path => {
    const filename = path.split('/').pop();
    const jobNumber = filename.replace(/\.[^/.]+$/, "").toLowerCase();
    const pdfSettings = [
      '-units',
      'PixelsPerInch',
      `${path}`,
      '-density',
      '120',
      '-geometry',
      '1420x960',
      '-compress',
      'Zip',
      '-strip',
      `hotfolder/output/pdfs/${jobNumber}.pdf`
    ];
    const largeJpgSettings = [
      '-units',
      'PixelsPerInch',
      `${path}`,
      '-density',
      '228.6',
      '-geometry',
      '770x522',
      '-strip',
      '-profile',
      'profiles/GRACoL2006_Coated1v2.icc',
      '-profile',
      'profiles/ColorMatchRGB.icc',
      `hotfolder/output/jpgs/large/${jobNumber}l.jpg`
    ];
    const smallJpgSettings = [
      '-units',
      'PixelsPerInch',
      `${path}`,
      '-density',
      '228.6',
      '-geometry',
      '142x210',
      '-strip',
      '-profile',
      'profiles/GRACoL2006_Coated1v2.icc',
      '-profile',
      'profiles/ColorMatchRGB.icc',
      `hotfolder/output/jpgs/small/${jobNumber}s.jpg`
    ];

    logger.info(`${jobNumber} has been added`);
    im.convert(pdfSettings, (err, stdout) => {
      if (err) loggerError.error(err);
      logger.info(`${jobNumber} PDF created`);
    });

    im.convert(largeJpgSettings, (err, stdout) => {
      if (err) loggerError.error(err);
      logger.info(`${jobNumber} JPG Large created`);
    });

    im.convert(smallJpgSettings, (err, stdout) => {
      if (err) loggerError.error(err);
      logger.info(`${jobNumber} JPG Small created`);

      setTimeout(() => {
        fs.rename(path, `hotfolder/input/processed/${filename}`, error => {
         if(error)
          loggerError.error(error);
        });
      }, 300);
    });
  });
