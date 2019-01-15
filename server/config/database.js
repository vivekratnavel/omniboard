import mongoose from 'mongoose';
import yargs from 'yargs';

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
} else if (process.env.MONGO_URI !== null || process.env.MONGO_URI !== undefined || process.env.MONGO_URI !== '') {
  mongodbURI = process.env.MONGO_URI;
} else {
  mongodbURI = `${defaultURI}/${defaultDatabase}`;
}

const mongoOptions = { auto_reconnect: true, useNewUrlParser: true };
const reconnectTries = 2;
let counter = 0;
const createConnection = function(mongodbURI, mongoOptions) {
  const db = mongoose.createConnection(mongodbURI, mongoOptions);

  db.on('error', function(err) {
    // If first connect fails because mongod is down, try again later.
    // This is only needed for first connect, not for runtime reconnects.
    // See: https://github.com/Automattic/mongoose/issues/5169
    if (err.message && err.message.match(/failed to connect to server .* on first connect/)) {
      console.log(new Date(), String(err));
      if (counter < reconnectTries) {
        counter++;
        // Wait for a bit, then try to connect again
        console.log('Retrying in 20 seconds...');
        setTimeout(function () {
          console.log('Retrying first connect...');
          db.openUri(mongodbURI).catch(() => {
          });
          // Why the empty catch?
          // Well, errors thrown by db.open() will also be passed to .on('error'),
          // so we can handle them there, no need to log anything in the catch here.
          // But we still need this empty catch to avoid unhandled rejections.
        }, 20 * 1000);
      } else {
        console.log(`Failed to establish connection to ${mongodbURI} after ${reconnectTries} retries. Exiting now...`);
        process.exit(1);
      }
    } else {
      // Some other error occurred.  Log it.
      console.error(new Date(), String(err));
    }
  });

  db.once('open', function() {
    console.log(`Connection to ${mongodbURI} established successfully!`);
  });

  return db;
};

export default createConnection(mongodbURI, mongoOptions);
