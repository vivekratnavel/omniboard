import React, {Component} from 'reactn';
import {Navbar, Nav, MenuItem, NavDropdown, Glyphicon, NavItem} from 'react-bootstrap';
import axios from 'axios';
import PropTypes from 'prop-types';
import {ToastContainer, toast} from 'react-toastify';
import moment from 'moment-timezone';
import backend, {setDbInfo} from '../Backend/backend';
import {parseServerError} from '../Helpers/utils';
import 'react-toastify/dist/ReactToastify.min.css';
import './style.scss';
import RunsTable from '../RunsTable/runsTable';
import {
  SETTING_TIMEZONE,
  AUTO_REFRESH_INTERVAL,
  DEFAULT_AUTO_REFRESH_INTERVAL,
  INITIAL_FETCH_SIZE, DEFAULT_INITIAL_FETCH_SIZE, ROW_HEIGHT, DEFAULT_ROW_HEIGHT
} from '../../appConstants/app.constants';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showCustomColumnModal: false,
      otherDbs: [],
      dbInfo: {},
      showSettingsModal: false,
      appVersion: ''
    };
  }

  static propTypes = {
    match: PropTypes.object,
    location: PropTypes.shape({
      search: PropTypes.string
    }),
    history: PropTypes.shape({
      push: PropTypes.func
    })
  };

  _resetCache = () => {
    localStorage.clear();
    location.reload();
  };

  _showCustomColumnModal = () => {
    this.setState({
      showCustomColumnModal: true
    });
  };

  _handleCustomColumnModalClose = () => {
    this.setState({
      showCustomColumnModal: false
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
   * SettingsResponse is of type
   * [
   *  {
   *   "_id": "5ca1ce94a686ac25c4a78eea",
   *   "name": "timezone",
   *   "value": "America/Los_Angeles"
   *  }
   * ]
   * @param {array} settingsResponse response for global settings from API.
   * @private
   */
  _updateGlobalSettings = settingsResponse => {
    const settings = settingsResponse.reduce((acc, current) => {
      return {...acc, [current.name]: current};
    }, this.global.settings);

    this.setGlobal({
      settings
    });
  };

  _initializeSetting = (setting, value) => {
    backend.post('api/v1/Omniboard.Settings', {
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
      axios.get('/api/v1/databases'),
      backend.get('api/v1/database'),
      backend.get('api/v1/Omniboard.Settings'),
      backend.get('api/v1/Version')
    ]).then(axios.spread((allDbResponse, dbResponse, settingsResponse, versionResponse) => {
      if (allDbResponse && allDbResponse.data) {
        this.setState({
          otherDbs: allDbResponse.data
        });
      }

      if (dbResponse && dbResponse.data) {
        this.setState({
          dbInfo: dbResponse.data
        });
      }

      if (versionResponse && versionResponse.data && versionResponse.data.version) {
        this.setState({
          appVersion: `v${versionResponse.data.version}`
        });
      }

      // Write default settings to the database for the first time
      // Guess the client timezone and set it as default
      const userTimezone = moment.tz.guess();
      if (settingsResponse && settingsResponse.data && settingsResponse.data.length > 0) {
        const settingsResponseData = settingsResponse.data;
        this._updateGlobalSettings(settingsResponseData);
        if (!settingsResponseData.some(setting => setting.name === SETTING_TIMEZONE)) {
          this._initializeSetting(SETTING_TIMEZONE, userTimezone);
        }

        if (!settingsResponseData.some(setting => setting.name === AUTO_REFRESH_INTERVAL)) {
          this._initializeSetting(AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL);
        }

        if (!settingsResponseData.some(setting => setting.name === INITIAL_FETCH_SIZE)) {
          this._initializeSetting(INITIAL_FETCH_SIZE, DEFAULT_INITIAL_FETCH_SIZE);
        }

        if (!settingsResponseData.some(setting => setting.name === ROW_HEIGHT)) {
          this._initializeSetting(ROW_HEIGHT, DEFAULT_ROW_HEIGHT);
        }
      } else if (settingsResponse && settingsResponse.status === 200) {
        // If empty response, then initialize all settings
        this._initializeSetting(SETTING_TIMEZONE, userTimezone);
        this._initializeSetting(AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL);
        this._initializeSetting(INITIAL_FETCH_SIZE, DEFAULT_INITIAL_FETCH_SIZE);
        this._initializeSetting(ROW_HEIGHT, DEFAULT_ROW_HEIGHT);
      }
    })).catch(error => {
      toast.error(parseServerError(error));
    });
  };

  componentDidMount() {
    const {match: {params}} = this.props;
    setDbInfo(backend, {path: params.dbPath});
    this._fetchData();
  }

  render() {
    const {showCustomColumnModal, showSettingsModal, dbInfo, otherDbs, appVersion} = this.state;
    if (!dbInfo || !dbInfo.key) {
      return <span>Loading app...</span>;
    }

    const localStorageKey = `${dbInfo.key}|RunsTable|1`;
    return (
      <div className='App'>
        <Navbar inverse fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <a href='#'>Omniboard <span className='version'>{appVersion}</span></a>
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav pullLeft activeKey={dbInfo.key}>
              {otherDbs.map(db => {
                return <NavItem key={db.key} eventKey={db.key} href={db.path}>{db.key} ({db.name})</NavItem>;
              })}
            </Nav>
            <Nav pullRight>
              <NavDropdown eventKey={1} title={<Glyphicon glyph='cog'/>} id='settings'>
                <MenuItem test-attr='reset-cache-button' eventKey={1.1} onClick={this._resetCache}>
                  <Glyphicon glyph='refresh'/>
                  &nbsp; Reset Cache
                </MenuItem>
                <MenuItem test-attr='manage-config-columns-button' eventKey={1.2} onClick={this._showCustomColumnModal}>
                  +/- Custom Columns
                </MenuItem>
                <MenuItem test-attr='settings-button' eventKey={1.3} onClick={this._showSettingsModal}>
                  <Glyphicon glyph='wrench'/>
                  &nbsp; Settings
                </MenuItem>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <div className='content'>
          <ToastContainer autoClose={false}/>
          <RunsTable dbInfo={dbInfo} localStorageKey={localStorageKey}
            showCustomColumnModal={showCustomColumnModal}
            handleCustomColumnModalClose={this._handleCustomColumnModalClose}
            showSettingsModal={showSettingsModal}
            handleSettingsModalClose={this._handleSettingsModalClose}
            location={this.props.location} history={this.props.history}/>
        </div>
      </div>
    );
  }
}

export default App;
