import express from 'express';
import * as path from 'path';

const frontend = express();
const router = express.Router();

frontend.use(router);

if (process.env.NODE_ENV === 'production') {
    // Serve any static files
    frontend.use(express.static(path.join(__dirname, '/../web/build/static')));
}

export default frontend;