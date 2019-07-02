import mongoose from 'mongoose';
import yargs from 'yargs';
import Grid from 'gridfs-stream';

const mongoOptions = {
  auto_reconnect: true,
  autoIndex: false, // Don't build indexes
  useNewUrlParser: true,
  reconnectTries: 10, // Retry up to 30 times
  reconnectInterval: 3000, // Reconnect every 3000ms
  poolSize: 10, // Maintain up to 10 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  bufferMaxEntries: 0
};
const createConnection = function(mongodbURI, mongoOptions) {
  const db = mongoose.createConnection(mongodbURI, mongoOptions);
  let counter = 0;

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

  return db;
};

export default function (mongodbURI) {
  let db = createConnection(mongodbURI, mongoOptions);
  let dbExport = {
    connection: db,
    gfs: null
  };

  db.once('open', function() {
    console.log(`Connection to ${mongodbURI} established successfully!`);
    dbExport.gfs = Grid(db.db, mongoose.mongo);
  });

  return dbExport;
}
