import config from './config/configFile';
import express from 'express';
import * as path from 'path';
import db from './config/database';
import subApp from './app';

const PORT = process.env.PORT || 9000;
const app = express();

const sections = Object.keys(config);
const defaultPath = config[sections[0]].path;
const allDatabases = [];
for (const section in sections) {
  const key = sections[section];
  const database = db(config[key].mongodbURI);
  let path = config[key].path;
  const runsCollectionName = "runsCollectionName" in config[key] ? config[key]["runsCollectionName"] : 'runs';
  const metricsCollectionName = "metricsCollectionName" in config[key] ? config[key]["metricsCollectionName"] : 'metrics';
  if (!path.startsWith('/')) {
    console.error(`Error: path for key ${key} is not absolute, prepending a slash...`);
    path = '/' + path;
  }
  if (path === '/') {
    throw `Fatal: cannot use root path for key ${key}, fix your database config.`;
  }
  allDatabases.push({
    key,
    path,
    "name": database.connection.name});
  app.use(config[key].path, subApp(database, key, path, runsCollectionName, metricsCollectionName));
}

app.get("/api/v1/databases", function (req, res) {
  res.json(allDatabases);
});

app.get("/", function (req, res) {
  res.redirect(defaultPath);
});

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '/../web/build')));
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Route Not Found');
  err.status = 404;
  next(err);
});

function logErrors (err, req, res, next) {
  /* eslint-disable no-console */
  console.error(err.stack);
  next(err);
}

function clientErrorHandler (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ message: 'An unknown error occurred!' });
  } else {
    next(err);
  }
}

function errorHandler (err, req, res, next) {
  res.status(500);
  res.send({ message: err.message });
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
