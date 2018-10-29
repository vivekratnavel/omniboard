import database from './config/database';
import express from 'express';
import * as path from 'path';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import restify from 'express-restify-mongoose';
import RunsModel from './models/runs';
import MetricsModel from './models/metrics';
import OmniboardColumnsModel from './models/omniboard.columns';
import FilesModel from './models/fs.files';
import ChunksModel from './models/fs.chunks';

const app = express();
const router = express.Router();

// Setup logger
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

// Extend express mime types
express.static.mime.define({'text/plain': ['py']});
express.static.mime.define({'application/octet-stream': ['pickle']});

//To prevent errors from Cross Origin Resource Sharing, we will set
//our headers to allow CORS with middleware like so:
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
  // and remove caching so we get the most recent data
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

restify.serve(router, RunsModel);
restify.serve(router, MetricsModel);
restify.serve(router, OmniboardColumnsModel);
restify.serve(router, FilesModel);
restify.serve(router, ChunksModel);
app.use(router);

router.get('/api/v1/files/:id', function(req, res) {
  FilesModel.findById(req.params.id).populate('chunk').exec(function(err, result) {
    if (err) throw (err);
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

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).json({message: 'Error: ' + err.message});
});

export default app;
