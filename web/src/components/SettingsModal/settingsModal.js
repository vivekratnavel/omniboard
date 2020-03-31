import PropTypes from 'prop-types';
import React, {PureComponent} from 'reactn';
import {Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, Alert, FormControl,
  Form, FormGroup, InputGroup, Col, ControlLabel} from 'react-bootstrap';
import './settingsModal.scss';
import axios from 'axios';
import Select from 'react-select';
import moment from 'moment-timezone';
import {toast} from 'react-toastify';
import backend from '../Backend/backend';
import {ProgressWrapper} from '../Helpers/hoc';
import {parseServerError} from '../Helpers/utils';
import {
  SETTING_TIMEZONE,
  AUTO_REFRESH_INTERVAL,
  INITIAL_FETCH_SIZE, ROW_HEIGHT
} from '../../appConstants/app.constants';

class SettingsModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleAutoRefreshUpdate: PropTypes.func.isRequired,
    handleInitialFetchSizeUpdate: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      initialSettings: {},
      settings: {},
      isInProgress: false,
      timezoneOptions: []
    };
  }

  _handleApply = () => {
    const {settings, initialSettings} = this.state;
    const {handleAutoRefreshUpdate, handleInitialFetchSizeUpdate} = this.props;
    const autoRefreshInterval = Number(settings[AUTO_REFRESH_INTERVAL].value);
    const rowHeight = Number(settings[ROW_HEIGHT].value);
    if (isNaN(autoRefreshInterval) || autoRefreshInterval < 5) {
      this.setState({
        error: 'Auto Refresh Interval must be a Number >= 5'
      });
    } else if (isNaN(rowHeight)) {
      this.setState({
        error: 'Row Height must be a number'
      });
    } else {
      // Get columns that were edited/modified
      const dirtySettings = Object.keys(initialSettings).reduce((accumulator, current) => {
        if (JSON.stringify(settings[current]) !== JSON.stringify(initialSettings[current])) {
          accumulator.push(settings[current]);
        }

        return accumulator;
      }, []);
      // All the settings will have _id if properly initialized in App/index.js
      // When the app loads for the first time, default values for settings are persisted in db.
      const updateRequests = dirtySettings.map(setting => backend.post(`api/v1/Omniboard.Settings/${setting._id}`,
        setting));
      const closeModal = () => {
        this.setState({isInProgress: false});
        this.props.handleClose();
      };

      const sendUpdateRequests = () => {
        axios.all(updateRequests).then(
          res => {
            const errors = res.filter(response => response.status !== 200);
            if (errors.length > 0) {
              this.setState({
                error: parseServerError(errors[0])
              });
            } else {
              this.setGlobal({
                settings
              }, () => {
                // Reset polling if auto refresh interval
                // setting was changed
                if (dirtySettings.find(setting => setting.name === AUTO_REFRESH_INTERVAL)) {
                  handleAutoRefreshUpdate();
                }

                if (dirtySettings.find(setting => setting.name === INITIAL_FETCH_SIZE)) {
                  handleInitialFetchSizeUpdate();
                }
              });
              toast.success('Settings saved successfully!');
              closeModal();
            }

            this.setState({
              isInProgress: false
            });
          }).catch(error => {
          this.setState({
            isInProgress: false,
            error: parseServerError(error)
          });
        });
      };

      if (updateRequests.length > 0) {
        this.setState({isInProgress: true, error: ''});
        sendUpdateRequests();
      } else {
        this.setState({
          error: 'There are no changes to be applied'
        });
      }
    }
  };

  _handleTimezoneChange = ({value}) => {
    this._handleSettingValueChange(SETTING_TIMEZONE, value);
  };

  _handleAutoRefreshIntervalChange = event => {
    const {value} = event.target;
    this._handleSettingValueChange(AUTO_REFRESH_INTERVAL, value);
  };

  _handleSettingValueChange = (key, value) => {
    const {settings} = this.state;
    const settingsClone = {...settings};
    const setting = {...settings[key], value};
    this.setState({
      settings: {...settingsClone, [key]: setting}
    });
  };

  _handleInitialFetchSizeChange = event => {
    const {value} = event.target;
    this._handleSettingValueChange(INITIAL_FETCH_SIZE, value);
  };

  _handleRowHeightChange = event => {
    const {value} = event.target;
    this._handleSettingValueChange(ROW_HEIGHT, value);
  };

  get isFormDirty() {
    const {initialSettings, settings} = this.state;
    return JSON.stringify(initialSettings) !== JSON.stringify(settings);
  }

  get isSubmitDisabled() {
    const {settings, isInProgress} = this.state;
    let isDisabled = false;
    if (settings && Object.keys(settings).length > 0) {
      Object.keys(settings).forEach(key => {
        if (!(settings[key] && settings[key].value)) {
          isDisabled = true;
        }
      });
    } else {
      isDisabled = true;
    }

    return isDisabled || !this.isFormDirty || isInProgress;
  }

  _initializeState = () => {
    const timezoneOptions = moment.tz.names();
    this.setState({
      initialSettings: this.global.settings,
      settings: this.global.settings,
      timezoneOptions
    });
  };

  componentDidMount() {
    this._initializeState();
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    // Load data every time this modal is being popped up
    if (prevProps.show !== this.props.show && this.props.show === true) {
      this._initializeState();
      // Reset error
      /* eslint-disable react/no-did-update-set-state */
      this.setState({
        error: ''
      });
      /* eslint-enable react/no-did-update-set-state */
    }
  }

  render() {
    const {show, handleClose} = this.props;
    const {settings, isInProgress, timezoneOptions, error} = this.state;
    const timezoneOptionsMap = timezoneOptions.map(name => {
      return {
        label: name,
        value: name
      };
    });
    const getSelectValue = (options, value) => {
      const selectValue = options.find(option => option.value === value);
      return selectValue ? selectValue : '';
    };

    const submitButtonText = isInProgress ? (
      <span>
        <i className='glyphicon glyphicon-refresh glyphicon-refresh-animate'/> Saving...
      </span>
    ) : <span>Save</span>;

    const errorAlert = error ? <Alert bsStyle='danger'>{error}</Alert> : '';

    const timezoneValue = settings && settings[SETTING_TIMEZONE] ? settings[SETTING_TIMEZONE].value : '';
    const autoRefreshInterval = settings && settings[AUTO_REFRESH_INTERVAL] ?
      settings[AUTO_REFRESH_INTERVAL].value : '';
    const initialFetchSize = settings && settings[INITIAL_FETCH_SIZE] ?
      settings[INITIAL_FETCH_SIZE].value : '';
    const rowHeight = settings && settings[ROW_HEIGHT] ? settings[ROW_HEIGHT].value : '';
    return (
      <Modal show={show} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>Manage Settings</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {errorAlert}
          <ProgressWrapper>
            <div>
              <Form horizontal>
                <FormGroup>
                  <Col componentClass={ControlLabel} sm={4}>
                    Timezone
                  </Col>
                  <Col sm={8}>
                    <Select
                      test-attr='timezone-select'
                      options={timezoneOptionsMap}
                      value={getSelectValue(timezoneOptionsMap, timezoneValue)}
                      clearable={false}
                      placeholder='Timezone'
                      onChange={this._handleTimezoneChange}
                    />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col componentClass={ControlLabel} sm={4}>
                    Auto Refresh Interval
                  </Col>
                  <Col sm={4}>
                    <InputGroup>
                      <FormControl
                        type='text'
                        test-attr='auto-refresh-interval'
                        value={autoRefreshInterval}
                        placeholder='Enter auto refresh interval'
                        onChange={this._handleAutoRefreshIntervalChange}
                      />
                      <InputGroup.Addon>Seconds</InputGroup.Addon>
                    </InputGroup>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col componentClass={ControlLabel} sm={4}>
                    Initial No. of Rows to Fetch
                  </Col>
                  <Col sm={4}>
                    <InputGroup>
                      <FormControl
                        type='number'
                        test-attr='initial-fetch-size'
                        value={initialFetchSize}
                        placeholder='Enter initial fetch size'
                        onChange={this._handleInitialFetchSizeChange}
                      />
                      <InputGroup.Addon>Rows</InputGroup.Addon>
                    </InputGroup>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col componentClass={ControlLabel} sm={4}>
                    Row Height
                  </Col>
                  <Col sm={2}>
                    <InputGroup>
                      <FormControl
                        type='number'
                        test-attr='row-height'
                        value={rowHeight}
                        placeholder='Enter row height for the table'
                        onChange={this._handleRowHeightChange}
                      />
                    </InputGroup>
                  </Col>
                </FormGroup>
              </Form>
            </div>
          </ProgressWrapper>
        </ModalBody>
        <ModalFooter>
          <Button test-attr='close-btn' onClick={handleClose}>Close</Button>
          <Button test-attr='apply-btn' bsStyle='primary' disabled={this.isSubmitDisabled} onClick={this._handleApply}>
            {submitButtonText}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export {SettingsModal};
