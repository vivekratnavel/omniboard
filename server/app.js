import {databaseConn, gfs} from './config/database';
import {authUser, authPwd, authSecret} from './config/auth';
import express from 'express';
import * as path from 'path';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import restify from 'express-restify-mongoose';
import RunsModel from './models/runs';
import MetricsModel from './models/metrics';
import OmniboardMetricColumnsModel from './models/omniboard.metric.columns';
import OmniboardCustomColumnsModel from './models/omniboard.custom.columns';
import OmniboardSettingsModel from './models/omniboard.settings';
import FilesModel from './models/fs.files';
import ChunksModel from './models/fs.chunks';
import archiver from 'archiver';
import { getRunsResponse } from "./runs.response";

const app = express();
const router = express.Router();
const session = require('express-session');
const moredots = require('moredots');
const isPlainObject = require('lodash.isplainobject');

// Basic auth, if configured
if (authPwd !== '') {
  app.use(session({ resave: true, secret: authSecret, saveUninitialized: true }));
  app.use((req, res, next) => {
    if (!req.session.user) {
      // https://stackoverflow.com/questions/23616371
      const auth = {login: authUser, password: authPwd};
      // parse login and password from headers
      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

      // Verify login and password are set and correct
      if (!login || !password || login !== auth.login || password !== auth.password) {
        res.set('WWW-Authenticate', 'Basic realm="401"'); // change this
        res.status(401).send('Authentication required.'); // custom message
        return
      }
      else {
        req.session.user = true;
      }
    }
    // Access granted
    next()
  })
}

// Setup logger
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

// Extend express mime types
express.static.mime.define({'text/plain': ['py']});
express.static.mime.define({'application/octet-stream': ['pickle']});

// To prevent errors from Cross Origin Resource Sharing, we will set
// our headers to allow CORS with middleware like so:
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
  // and remove caching so we get the most recent data
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

restify.serve(router, MetricsModel);
restify.serve(router, OmniboardMetricColumnsModel);
restify.serve(router, OmniboardCustomColumnsModel);
restify.serve(router, OmniboardSettingsModel);
restify.serve(router, FilesModel);
restify.serve(router, ChunksModel);
app.use(router);

router.get('/api/v1/files/:id', function(req, res, next) {
  FilesModel.findById(req.params.id).populate('chunk').exec(function(err, result) {
    if (err) return next(err);
    const resultData = new Buffer.from(result.chunk[0].data, 'base64');
    const fileName = result.filename.split('/').splice(-1)[0];
    res.contentType(fileName);
    res.set({
      'Content-Length': resultData.length,
      'Content-Disposition': 'attachment; filename=' + fileName
    });
    res.send(resultData);
  });
});

router.get('/api/v1/Version', function(req, res, next) {
  res.json({version: process.env.npm_package_version});
});

router.get('/api/v1/Runs/count', function(req, res, next) {
  if (req.query.query) {
    getRunsResponse(req, res, next, null, true);
  } else {
    RunsModel.estimatedDocumentCount({}, function(err, count) {
      if (err) return next(err);
      res.json({count});
    });
  }
});

router.get('/api/v1/Runs', function(req, res, next) {
  getRunsResponse(req, res, next);
});

router.get('/api/v1/Runs/:id', function(req, res, next) {
  getRunsResponse(req, res, next, req.params.id);
});

// This function is borrowed from express-restify-mongoose
// https://github.com/florianholzapfel/express-restify-mongoose/blob/f8b1e7990a2ad3f23edc26d2b65061e5949d7d78/src/operations.js#L194
function depopulate(src, contextModel) {
  const dst = {};

  for (const key in src) {
    const path = contextModel && contextModel.schema.path(key);

    if (path && path.caster && path.caster.instance === 'ObjectID') {
      if (Array.isArray(src[key])) {
        for (let j = 0; j < src[key].length; ++j) {
          if (typeof src[key][j] === 'object') {
            dst[key] = dst[key] || [];
            dst[key].push(src[key][j]._id);
          }
        }
      } else if (isPlainObject(src[key])) {
        dst[key] = src[key]._id;
      }
    } else if (isPlainObject(src[key])) {
      if (path && path.instance === 'ObjectID') {
        dst[key] = src[key]._id;
      } else {
        dst[key] = depopulate(src[key]);
      }
    }

    if (typeof dst[key] === 'undefined') {
      dst[key] = src[key];
    }
  }

  return dst
}

router.put('/api/v1/Runs/:id', function(req, res, next) {
  const filter = {_id: req.params.id};

  const update = moredots(depopulate(req.body));

  RunsModel.findOneAndUpdate(filter, update, {new: true}, function(err, doc) {
    if (err) {
      /* eslint-disable no-console */
      console.error('An error occurred: ', err);
      next(err);
    } else {
      res.status(200).json(doc);
    }
  });
});

router.delete('/api/v1/Runs/:id', function(req, res, next) {
  RunsModel.findOneAndDelete({_id: req.params.id}, function(err, doc) {
    if (err) {
      /* eslint-disable no-console */
      console.error('An error occurred: ', err);
      next(err);
    } else {
      res.status(204).json(doc);
    }
  });
});

router.get('/api/v1/files/download/:id/:fileName', function(req, res) {
  // Read file as stream from Mongo GridFS
  const readStream = gfs.createReadStream({
    _id: req.params.id
  });
  //error handling, e.g. file does not exist
  readStream.on('error', function (err) {
    console.error('An error occurred: ', err);
    throw err;
  });

  const fileName = req.params.fileName;
  res.contentType(fileName);
  res.set({
    'Content-Disposition': 'attachment; filename=' + fileName
  });

  // Pipe the file stream to http response
  readStream.pipe(res);
});

router.get('/api/v1/files/downloadAll/:runId/:fileType', function(req, res, next) {
  const FILE_TYPE = {
    SOURCE_FILES: 'source_files',
    ARTIFACTS: 'artifacts'
  };
  const allowedTypes = [
    FILE_TYPE.SOURCE_FILES,
    FILE_TYPE.ARTIFACTS
  ];
  const fileType = req.params.fileType;
  const runId = req.params.runId;
  if (!allowedTypes.includes(fileType)) {
    res.status(400).json({message: 'Error: Invalid input for fileType.'});
  } else {
    RunsModel.findById(req.params.runId).exec(function(err, result) {
      if (err) return next(err);
      let files = [];
      if (fileType === FILE_TYPE.SOURCE_FILES) {
        if (result && result.experiment && result.experiment.sources) {
          files = result.experiment.sources.map(source => {
            return {
              name: source[0],
              file_id: source[1]
            }
          });
        } else {
          res.status(500).json({message: 'Error: Unable to fetch source files for runId: ' + runId});
        }
      } else {
        // fileType: artifacts
        files = result.artifacts;
      }
      const archive = archiver('zip', {
        zlib: { level: 5 } // Sets the compression level.
      });
      const fileName = `${fileType}-${runId}.zip`; // ex: source-files-1.zip
      const dirName = `${fileType}-${runId}`; // ex: source-files-1
      archive.on('error', function(err) {
        /* eslint-disable no-console */
        console.error('An error occurred: ', err);
        res.status(500);
        next(err);
      });
      files.forEach(function(file) {
        const readStream = gfs.createReadStream({
          _id: file.file_id
        });
        //error handling, e.g. file does not exist
        readStream.on('error', function (err) {
          /* eslint-disable no-console */
          console.error('An error occurred: ', err);
          res.status(500);
          next(err);
        });
        // add file to archive
        archive.append(readStream, {name: file.name, prefix: dirName});
      });
      archive.finalize();
      res.set({
        'Content-Disposition': 'attachment; filename=' + fileName
      });
      archive.pipe(res);
    });
  }
});

router.get('/api/v1/files/preview/:fileId', function(req, res, next) {
  // Read file as stream from Mongo GridFS
  const readStream = gfs.createReadStream({
    _id: req.params.fileId
  });
  //error handling, e.g. file does not exist
  readStream.on('error', function (err) {
    console.error('An error occurred: ', err);
    next(err);
  });

  // Pipe the file stream to http response
  readStream.pipe(res);
});

router.get('/api/v1/database', function(req, res) {
  if (databaseConn && databaseConn.name) {
    res.json({name: databaseConn.name});
  } else {
    res.status(500).json({message: 'An unknown error occurred'})
  }
});

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '/../web/build')));
  // Handle React routing, return all requests to React app
  app.use(function (req, res, next) {
    res.sendFile(path.join(__dirname, '/../web/build', 'index.html'));
  });
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
  res.render('error', { message: err });
}

export default app;
