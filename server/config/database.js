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
} else {
  mongodbURI = `${defaultURI}/${defaultDatabase}`;
}

const db = mongoose.createConnection(mongodbURI);
db.on('error', console.error.bind(console, 'Database connection error: '));
db.once('open', function() {
  console.log(`Database ${mongodbURI} connected successfully!`);
});

export default db;
