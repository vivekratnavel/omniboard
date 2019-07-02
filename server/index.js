import config from './config/configFile';
import express from 'express';
import db from './config/database';
import subApp from './app';
import frontend from './frontend';

const PORT = process.env.PORT || 9000;
const app = express();

app.use("/static", frontend);

const sections = Object.keys(config);
for (const section in sections) {
  app.use(config[sections[section]].path, subApp(db(config[sections[section]].mongodbURI)));
}

const startServer = (port) => {
  app.listen(port, () => {
    console.log(`Omniboard is listening on port ${port}!`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      const newPort = Number(port) + 1;
      console.log(`Error: Port ${port} is already in use. Retrying with port ${newPort}...`);
      startServer(newPort);
    } else {
      console.error(e);
    }
  });
};

startServer(PORT);
