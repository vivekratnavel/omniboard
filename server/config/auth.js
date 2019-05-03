import yargs from 'yargs';

const argv = yargs.argv;

const defaultUser = 'admin';
const defaultPwd = '';
const defaultSecret = 'secret-phrase';
let authUser = '';
let authPwd = '';
let authSecret = '';

if ('u' in argv) {
  if (argv['u'] && argv['u'].indexOf(':')) {
    // Parse argument in format -u user:pwd:secret
    const authArray = argv['u'].split(':');
    if (authArray.length === 3) {
      authUser = authArray[0];
      authPwd = authArray[1];
      authSecret = authArray[2];
    } else {
      throw new Error('Invalid command line argument passed to "-u" option.');
    }
  } else {
    throw new Error('Invalid command line argument passed to "-u" option.');
  }
} else {
  authUser = defaultUser;
  authPwd = defaultPwd;
  authSecret = defaultSecret;
}

export {authUser, authPwd, authSecret};