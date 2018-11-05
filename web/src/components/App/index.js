import React, { Component } from 'react';
import { Navbar } from 'react-bootstrap';
import RunsTable from '../RunsTable/runsTable';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import './style.scss';

class App extends Component {
  render() {
    const localStorageKey = 'RunsTable|1';
    return (
      <div className="App">
        <Navbar variant="dark" bg="dark">
          <Navbar.Brand href="/">
            Omniboard
          </Navbar.Brand>
        </Navbar>
        <div className="content">
          <ToastContainer autoClose={false}/>
          <RunsTable localStorageKey={localStorageKey}/>
        </div>
      </div>
    );
  }
}

export default App;
