const pm2 = require('pm2');
const { apps } = require('./manifest/manifest_renaming.json');

pm2.connect(err => {
	if (err) {
		console.error(err);
		process.exit(2);
	}

	apps.forEach(app => {
		pm2.start(
			app.script,
			{
				instances: app.instances,
			},
			err => {
				if (err) console.error(err);
				pm2.disconnect();
			}
		);
	})
});

setInterval(() => pm2.flush(), 86400 * 1000);