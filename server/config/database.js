import mongoose from 'mongoose';
import yargs from 'yargs';
import Grid from 'gridfs-stream';

const argv = yargs.argv;

const defaultURI = 'mongodb://localhost';
const defaultDatabase = 'sacred';
let mongodbURI = '';

if ('m' in argv) {
  if (argv['m'] && argv['m'].indexOf(':')) {
    // Parse argument in format -m host:port:database
    const dbArray = argv['m'].split(':');
    if (dbArray.length === 3) {
      mongodbURI = `mongodb://${dbArray[0]}:${dbArray[1]}/${dbArray[2]}`;
    } else {
      throw new Error('Invalid command line argument passed to "-m" option.');
    }
  } else {
    mongodbURI = `${defaultURI}/${argv['m']}`;
  }
} else if ('mu' in argv) {
  // Parse mongodb connection url passed as an arg
  // Ex: --mu mongodb://user:pwd@host/sacred?authSource=admin
  mongodbURI = `${argv['mu']}`;
} else if (process.env.MONGO_URI) {
  mongodbURI = process.env.MONGO_URI;
} else {
  mongodbURI = `${defaultURI}/${defaultDatabase}`;
}

const mongoOptions = {
  auto_reconnect: true,
  autoIndex: false, // Don't build indexes
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  reconnectTries: 10, // Retry up to 30 times
  reconnectInterval: 3000, // Reconnect every 3000ms
  poolSize: 10, // Maintain up to 10 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  bufferMaxEntries: 0
};
let counter = 0;
let gfs = null;
const createConnection = function(mongodbURI, mongoOptions) {
  const db = mongoose.createConnection(mongodbURI, mongoOptions);

  db.on('error', function(err) {
    // If first connect fails because mongod is down, try again later.
      console.log(new Date(), String(err));
      if (counter < mongoOptions.reconnectTries) {
        counter++;
        // Wait for a bit, then try to connect again
        console.log(`Retrying in ${mongoOptions.reconnectInterval / 1000} seconds...`);
        setTimeout(function () {
          console.log('Retrying first connect...');
          db.openUri(mongodbURI).catch(() => {
          });
          // Why the empty catch?
          // Well, errors thrown by db.open() will also be passed to .on('error'),
          // so we can handle them there, no need to log anything in the catch here.
          // But we still need this empty catch to avoid unhandled rejections.
        }, mongoOptions.reconnectInterval);
      } else {
        console.log(`Failed to establish connection to ${mongodbURI} after ${mongoOptions.reconnectTries} retries. Exiting now...`);
        process.exit(1);
      }
  });

  db.once('open', function() {
    console.log(`Connection to ${mongodbURI} established successfully!`);
    gfs = Grid(db.db, mongoose.mongo);
  });

  return db;
};
const databaseConn = createConnection(mongodbURI, mongoOptions);

export {databaseConn, gfs};
