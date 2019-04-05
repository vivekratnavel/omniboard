import ReactDOM from 'react-dom';
import Routes from './routes';
import { AppContainer } from 'react-hot-loader';
import React, { setGlobal } from 'reactn';
import 'react-table/react-table.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'react-bootstrap-multiselect/css/bootstrap-multiselect.css';
import './components/RunsTable/runsTable.scss';
import 'rc-slider/assets/index.css';

import NextApp from './routes';
import {SETTING_TIMEZONE, AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL} from "./appConstants/app.constants";

// Set an initial global state directly:
setGlobal({
  settings: {
    [SETTING_TIMEZONE]: {
      value: ''
    },
    [AUTO_REFRESH_INTERVAL]: {
      value: DEFAULT_AUTO_REFRESH_INTERVAL
    }
  }
});

const rootEl = document.getElementById('root');
ReactDOM.render(<AppContainer><Routes /></AppContainer>, rootEl);

if (module.hot) {
  module.hot.accept('./routes', () => {
    ReactDOM.render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      rootEl
    );
  });
}