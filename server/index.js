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
  var database = db(config[sections[section]].mongodbURI);
  allDatabases.push({
    "path": config[sections[section]].path,
    "name": database.connection.name});
  app.use(config[sections[section]].path, subApp(database));
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
