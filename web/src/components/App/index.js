import React, { Component } from 'react';
import { Navbar, Nav, MenuItem, NavDropdown, Glyphicon } from 'react-bootstrap';
import RunsTable from '../RunsTable/runsTable';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import './style.scss';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showConfigColumnModal: false
    }
  }

  _resetCache = () => {
    localStorage.clear();
    location.reload();
  };

  _showConfigColumnModal = () => {
    this.setState({
      showConfigColumnModal: true
    });
  };

  _handleConfigColumnModalClose = () => {
    this.setState({
      showConfigColumnModal: false
    });
  };

  render() {
    const {showConfigColumnModal} = this.state;
    const localStorageKey = 'RunsTable|1';
    return (
      <div className="App">
        <Navbar inverse fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="/">Omniboard</a>
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav pullRight>
              <NavDropdown eventKey={1} title={<Glyphicon glyph="cog" />} id="settings">
                <MenuItem test-attr="reset-cache-button" eventKey={1.1} onClick={this._resetCache}>
                  <Glyphicon glyph="refresh"/>
                  &nbsp; Reset Cache
                </MenuItem>
                <MenuItem test-attr="manage-config-columns-button" eventKey={1.2} onClick={this._showConfigColumnModal}>
                  +/- Config Columns
                </MenuItem>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <div className="content">
          <ToastContainer autoClose={false}/>
          <RunsTable localStorageKey={localStorageKey} showConfigColumnModal={showConfigColumnModal}
                     handleConfigColumnModalClose={this._handleConfigColumnModalClose} />
        </div>
      </div>
    );
  }
}

export default App;
