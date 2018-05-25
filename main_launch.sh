node proofing.js

node staging.js

pm2 stop download_staging upload_staging cco_staging

node cco.js

pm2 stop upload

node production.js

pm2 dash