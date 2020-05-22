import yargs from 'yargs';

const argv = yargs.argv;
let config = {};

if (process.env.OMNIBOARD_CONFIG) {
  config = require(process.env.OMNIBOARD_CONFIG);
} else {
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

  config = {
    "default": {
      "mongodbURI": mongodbURI,
      "path": "/sacred"
    }
  }
}

export default config;
