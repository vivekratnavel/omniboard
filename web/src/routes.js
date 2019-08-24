import React from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';

import App from './components/App';
import NotFound from './components/NotFound';

const Routes = props => (
  <Router {...props}>
    <div>
      <Switch>
        <Route exact path='/' component={App}/>
        <Route component={NotFound}/>
      </Switch>
    </div>
  </Router>
);

export default Routes;
