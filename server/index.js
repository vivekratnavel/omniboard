import config from './config/configFile';
import express from 'express';
import db from './config/database';
import subApp from './app';
import frontend from './frontend';

const PORT = process.env.PORT || 9000;
const app = express();

app.use("/static", frontend);

const sections = Object.keys(config);
const defaultPath = config[sections[0]].path;
const allDatabases = [];
for (const section in sections) {
  const key = sections[section];
  const database = db(config[key].mongodbURI);
  if (!config[key].path.startsWith('/')) {
    console.error(`Error: path for key ${key} is not absolute, prepending a slash...`);
    config[key].path = '/' + config[key].path;
  }
  if (config[key].path == '/') {
    throw `Fatal: cannot use root path for key ${key}, fix your database config.`;
  }
  allDatabases.push({
    "key": key,
    "path": config[key].path,
    "name": database.connection.name});
  app.use(config[key].path, subApp(database, key));
}
app.use("/api/v1/databases", function (req, res) {
  res.json(allDatabases);
});


function defaultRedirect(req, res) {
  res.redirect(defaultPath);
}
app.use(defaultRedirect);

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
