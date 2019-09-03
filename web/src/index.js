import ReactDOM from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import React, {setGlobal} from 'reactn';
import 'react-table/react-table.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'react-bootstrap-multiselect/css/bootstrap-multiselect.css';
import './components/RunsTable/runsTable.scss';
import 'rc-slider/assets/index.css';

import NextApp from './routes';
import {SETTING_TIMEZONE, AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL, DEFAULT_INITIAL_FETCH_SIZE,
  INITIAL_FETCH_SIZE} from './appConstants/app.constants';

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
    }
  }
});

const rootEl = document.querySelector('#root');
ReactDOM.render(<AppContainer><NextApp/></AppContainer>, rootEl);

if (module.hot) {
  module.hot.accept('./routes', () => {
    ReactDOM.render(
      <AppContainer>
        <NextApp/>
      </AppContainer>,
      rootEl
    );
  });
}
