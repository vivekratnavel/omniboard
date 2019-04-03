import PropTypes from 'prop-types';
import React, { PureComponent } from 'reactn';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, Alert } from 'react-bootstrap';
import './settingsModal.scss';
import axios from 'axios';
import Select from 'react-select';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';
import moment from 'moment-timezone';
import { SETTING_TIMEZONE } from '../App/index';
import { toast } from 'react-toastify';

class SettingsModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      initialSettings: {},
      settings: {},
      isInProgress: false,
      timezoneOptions: []
    }
  }

  _handleApply = () => {
    const {settings, initialSettings} = this.state;
    // Get columns that were edited/modified
    const dirtySettings = Object.keys(initialSettings).reduce( (accumulator, current) => {
      if (JSON.stringify(settings[current]) !== JSON.stringify(initialSettings[current])) {
        accumulator.push(settings[current]);
      }
      return accumulator;
    }, []);
    const updateRequests = dirtySettings.map(setting => axios.post(`/api/v1/Omniboard.Settings/${setting._id}`,
      setting));
    const closeModal = () => {
      this.setState({ isInProgress: false });
      this.props.handleClose();
    };
    const sendUpdateRequests = () => {
      axios.all(updateRequests).then(
        res => {
          const errors = res.filter(response => response.status !== 200);
          if (errors.length) {
            this.setState({
              isInProgress: false,
              error: parseServerError(errors[0])
            });
          } else {
            this.setState({
              isInProgress: false
            });
            this.setGlobal({
              settings
            });
            toast.success(`Settings saved successfully!`);
            closeModal();
          }
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
  };

  _handleSettingValueChange = (key) => {
    return ({value}) => {
      const {settings} = this.state;
      const settingsClone = Object.assign({}, settings);
      const setting = Object.assign({}, settings[key], {value});
      this.setState({
        settings: Object.assign({}, settingsClone, {[key]: setting})
      });
    }
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
    return(
      <Modal show={show} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>Manage Settings</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {errorAlert}
          <ProgressWrapper>
            <div>
              <form>
                <label>
                  Timezone:
                  <Select
                    test-attr={"timezone-select"}
                    options={timezoneOptionsMap}
                    onChange={this._handleSettingValueChange(SETTING_TIMEZONE)}
                    value={getSelectValue(timezoneOptionsMap, timezoneValue)}
                    clearable={false}
                    placeholder="Timezone"
                    className="settings-select"
                  />
                </label>
              </form>
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
