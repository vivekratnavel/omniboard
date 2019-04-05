import React, { Component } from 'reactn';
import { Navbar, Nav, MenuItem, NavDropdown, Glyphicon, NavItem } from 'react-bootstrap';
import RunsTable from '../RunsTable/runsTable';
import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import { parseServerError } from "../Helpers/utils";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import './style.scss';
import { SettingsModal } from "../SettingsModal/settingsModal";
import moment from 'moment-timezone';
import {SETTING_TIMEZONE, AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL} from "../../appConstants/app.constants";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showConfigColumnModal: false,
      dbName: '',
      showSettingsModal: false
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

  _showSettingsModal = () => {
    this.setState({
      showSettingsModal: true
    });
  };

  _handleSettingsModalClose = () => {
    this.setState({
      showSettingsModal: false
    });
  };

  /**
   * settingsResponse is of type
   * [
   *  {
   *   "_id": "5ca1ce94a686ac25c4a78eea",
   *   "name": "timezone",
   *   "value": "America/Los_Angeles"
   *  }
   * ]
   * @param settingsResponse
   * @private
   */
  _updateGlobalSettings = (settingsResponse) => {
    const settings = settingsResponse.reduce( (acc, current) => {
      return Object.assign({}, acc, {[current.name]: current});
    }, this.global.settings);

    this.setGlobal({
      settings
    });
  };

  _initializeSetting = (setting, value) => {
    axios.post('/api/v1/Omniboard.Settings', {
      name: setting,
      value
    }).then(response => {
      if (response.status === 201) {
        this._updateGlobalSettings([response.data]);
      }
    });
  };

  _fetchData = () => {
    axios.all([
      axios.get('/api/v1/database'),
      axios.get('/api/v1/Omniboard.Settings')
    ]).then(axios.spread((dbResponse, settingsResponse) => {
      if (dbResponse && dbResponse.data && dbResponse.data.name) {
        this.setState({
          dbName: dbResponse.data.name
        });
      }
      // Write default settings to the database for the first time
      // Guess the client timezone and set it as default
      const userTimezone = moment.tz.guess();
      if (settingsResponse && settingsResponse.data && settingsResponse.data.length) {
        const settingsResponseData = settingsResponse.data;
        this._updateGlobalSettings(settingsResponseData);
        if (!settingsResponseData.some(setting => setting.name === SETTING_TIMEZONE)) {
          this._initializeSetting(SETTING_TIMEZONE, userTimezone);
        }
        if (!settingsResponseData.some(setting => setting.name === AUTO_REFRESH_INTERVAL)) {
          this._initializeSetting(AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL);
        }
      } else if (settingsResponse && settingsResponse.status === 200) {
        // if empty response, then initialize all settings
        this._initializeSetting(SETTING_TIMEZONE, userTimezone);
        this._initializeSetting(AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL);
      }
    })).catch(error => {
      toast.error(parseServerError(error));
    });
  };

  componentDidMount() {
    this._fetchData();
  }

  render() {
    const {showConfigColumnModal, showSettingsModal, dbName} = this.state;
    const localStorageKey = 'RunsTable|1';
    return (
      <div className="App">
        <Navbar inverse fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#">Omniboard</a>
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav pullLeft>
              <NavItem>({dbName})</NavItem>
            </Nav>
            <Nav pullRight>
              <NavDropdown eventKey={1} title={<Glyphicon glyph="cog" />} id="settings">
                <MenuItem test-attr="reset-cache-button" eventKey={1.1} onClick={this._resetCache}>
                  <Glyphicon glyph="refresh"/>
                  &nbsp; Reset Cache
                </MenuItem>
                <MenuItem test-attr="manage-config-columns-button" eventKey={1.2} onClick={this._showConfigColumnModal}>
                  +/- Config Columns
                </MenuItem>
                <MenuItem test-attr="settings-button" eventKey={1.3} onClick={this._showSettingsModal}>
                  <Glyphicon glyph="wrench"/>
                  &nbsp; Settings
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
        <SettingsModal show={showSettingsModal} handleClose={this._handleSettingsModalClose}/>
      </div>
    );
  }
}

export default App;
