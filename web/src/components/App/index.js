import React, { Component } from 'react';
import { Navbar } from 'react-bootstrap';
import RunsTable from '../RunsTable/runsTable';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import './style.scss';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Navbar inverse fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="/">Omniboard</a>
            </Navbar.Brand>
          </Navbar.Header>
        </Navbar>
        <div className="content">
          <ToastContainer autoClose={false}/>
          <RunsTable/>
        </div>
      </div>
    );
  }
}

export default App;
