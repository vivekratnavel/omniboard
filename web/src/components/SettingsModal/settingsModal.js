import PropTypes from 'prop-types';
import React, { PureComponent } from 'reactn';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, Alert, FormControl,
  Form, FormGroup, InputGroup, Col, ControlLabel } from 'react-bootstrap';
import './settingsModal.scss';
import backend from '../Backend/backend';
import axios from 'axios';
import Select from 'react-select';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';
import moment from 'moment-timezone';
import { SETTING_TIMEZONE, AUTO_REFRESH_INTERVAL, DEFAULT_AUTO_REFRESH_INTERVAL } from "../../appConstants/app.constants";
import { toast } from 'react-toastify';

class SettingsModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleAutoRefreshUpdate: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      initialSettings: {},
      settings: {},
      isInProgress: false,
      autoRefreshInterval: null,
      timezoneOptions: []
    }
  }

  _handleApply = () => {
    const {settings, initialSettings} = this.state;
    const { handleAutoRefreshUpdate } = this.props;
    const autoRefreshInterval = Number(settings[AUTO_REFRESH_INTERVAL].value);
    if(isNaN(autoRefreshInterval) || autoRefreshInterval < 5) {
      this.setState({
        error: 'Auto Refresh Interval must be a Number >= 5'
      });
    } else {

      // Get columns that were edited/modified
      const dirtySettings = Object.keys(initialSettings).reduce((accumulator, current) => {
        if (JSON.stringify(settings[current]) !== JSON.stringify(initialSettings[current])) {
          accumulator.push(settings[current]);
        }
        return accumulator;
      }, []);
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
            if (errors.length) {
              this.setState({
                error: parseServerError(errors[0])
              });
            } else {
              this.setGlobal({
                settings
              }, () => {
                // reset polling if auto refresh interval
                // setting was changed
                if (dirtySettings.find(setting => setting.name === AUTO_REFRESH_INTERVAL)) {
                  handleAutoRefreshUpdate();
                }
              });
              toast.success(`Settings saved successfully!`);
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
        })
      };
      if (updateRequests.length) {
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

  _handleAutoRefreshIntervalChange = (event) => {
    const value = event.target.value;
    this._handleSettingValueChange(AUTO_REFRESH_INTERVAL, value);
  };

  _handleSettingValueChange = (key, value) => {
    const {settings} = this.state;
    const settingsClone = Object.assign({}, settings);
    const setting = Object.assign({}, settings[key], {value});
    this.setState({
      settings: Object.assign({}, settingsClone, {[key]: setting})
    });
  };

  get isFormDirty() {
    const {initialSettings, settings} = this.state;
    return JSON.stringify(initialSettings) !== JSON.stringify(settings);
  }

  get isSubmitDisabled() {
    const {settings, isInProgress} = this.state;
    let isDisabled = false;
    if (settings && Object.keys(settings).length) {
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
      timezoneOptions: timezoneOptions
    });
  };

  componentDidMount() {
    this._initializeState();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Load data every time this modal is being popped up
    if (prevProps.show !== this.props.show && this.props.show === true) {
      this._initializeState();
      // reset error
      this.setState({
        error: ''
      });
    }
  }

  render() {
    const {show, handleClose} = this.props;
    const {settings, isInProgress, timezoneOptions, error} = this.state;
    const timezoneOptionsMap = timezoneOptions.map(name => {
      return {
        label: name,
        value: name
      }
    });
    const getSelectValue = (options, value) => {
      const selectValue = options.find(option => option.value === value);
      return selectValue ? selectValue : '';
    };

    const submitButtonText = isInProgress ? <span>
      <i className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/> Saving...</span>: <span>Save</span>;

    const errorAlert = error ? <Alert bsStyle="danger">{error}</Alert> : '';

    const timezoneValue = settings && settings[SETTING_TIMEZONE] ? settings[SETTING_TIMEZONE].value : '';
    const autoRefreshInterval = settings && settings[AUTO_REFRESH_INTERVAL] ?
      settings[AUTO_REFRESH_INTERVAL].value : DEFAULT_AUTO_REFRESH_INTERVAL/1000;
    return(
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
                      test-attr={"timezone-select"}
                      options={timezoneOptionsMap}
                      onChange={this._handleTimezoneChange}
                      value={getSelectValue(timezoneOptionsMap, timezoneValue)}
                      clearable={false}
                      placeholder="Timezone"
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
                        type="text"
                        test-attr={"auto-refresh-interval"}
                        value={autoRefreshInterval}
                        placeholder="Enter auto refresh interval"
                        onChange={this._handleAutoRefreshIntervalChange}
                      />
                      <InputGroup.Addon>Seconds</InputGroup.Addon>
                    </InputGroup>
                  </Col>
                </FormGroup>
              </Form>
            </div>
          </ProgressWrapper>
        </ModalBody>
        <ModalFooter>
          <Button test-attr="close-btn" onClick={handleClose}>Close</Button>
          <Button test-attr="apply-btn" bsStyle="primary" onClick={this._handleApply} disabled={this.isSubmitDisabled}>
            {submitButtonText}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export {SettingsModal};
