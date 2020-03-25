import {render} from 'react-dom';
import React, {setGlobal} from 'reactn';
import 'react-table/react-table.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'react-bootstrap-multiselect/css/bootstrap-multiselect.css';
import './components/RunsTable/runsTable.scss';
import 'rc-slider/assets/index.css';
// eslint-disable-next-line import/extensions
import 'regenerator-runtime/runtime.js';

import NextApp from './routes';
import {
  SETTING_TIMEZONE, AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL, DEFAULT_INITIAL_FETCH_SIZE,
  INITIAL_FETCH_SIZE, ROW_HEIGHT, DEFAULT_ROW_HEIGHT
} from './appConstants/app.constants';

// Set an initial global state directly:
setGlobal({
  settings: {
    [SETTING_TIMEZONE]: {
      value: ''
    },
    [AUTO_REFRESH_INTERVAL]: {
      value: DEFAULT_AUTO_REFRESH_INTERVAL
    },
    [INITIAL_FETCH_SIZE]: {
      value: DEFAULT_INITIAL_FETCH_SIZE
    },
    [ROW_HEIGHT]: {
      value: DEFAULT_ROW_HEIGHT
    }
  }
});

const rootEl = document.querySelector('#root');
render(<NextApp/>, rootEl);
