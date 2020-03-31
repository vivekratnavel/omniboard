import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Glyphicon} from 'react-bootstrap';
import './capturedOutView.scss';
import {toast} from 'react-toastify';
import backend from '../Backend/backend';
import {STATUS} from '../../appConstants/status.constants';
import {parseServerError} from '../Helpers/utils';

const RELOAD_TIMEOUT = 3000;
export const MAX_ERROR_COUNT = 10;

class CapturedOutView extends Component {
  static propTypes = {
    initialOutput: PropTypes.string.isRequired,
    initialStatus: PropTypes.string.isRequired,
    runId: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      status: props.initialStatus,
      capturedOut: props.initialOutput,
      lastUpdate: new Date().toString(),
      errorCount: 0
    };
  }

  componentDidMount() {
    this._checkAndReloadData();
  }

  get _isLiveReloadEnabled() {
    const {status, errorCount} = this.state;
    return status === STATUS.RUNNING && errorCount < MAX_ERROR_COUNT;
  }

  _checkAndReloadData = () => {
    // If status is "RUNNING", reload captured_out after reload timeout
    if (this._isLiveReloadEnabled) {
      this._reloadAfterTimeout();
    }
  };

  _loadData = () => {
    const {runId} = this.props;
    const {errorCount} = this.state;
    backend.get(`api/v1/Runs/${runId}`, {
      params: {
        select: 'captured_out,status,heartbeat'
      }
    })
      .then(runsResponse => {
        const runsResponseData = runsResponse.data;
        const {status} = runsResponseData;
        this.setState({
          capturedOut: runsResponseData.captured_out,
          status,
          lastUpdate: new Date().toString()
        }, this._checkAndReloadData);
      })
      .catch(error => {
        const updatedErrorCount = errorCount + 1;
        this.setState({
          errorCount: updatedErrorCount
        });
        toast.error(parseServerError(error), {autoClose: 5000});
        if (updatedErrorCount >= MAX_ERROR_COUNT) {
        // Stop polling and throw an error
          toast.error(`Stopping Live Reload on run id: ${runId} due to too many errors. Please try again later!`);
        } else {
          this._reloadAfterTimeout();
        }
      });
  };

  _reloadAfterTimeout = () => {
    setTimeout(this._loadData, RELOAD_TIMEOUT);
  };

  render() {
    const {capturedOut, lastUpdate} = this.state;
    // Remove timezone from lastUpdate date string
    const lastUpdateTime = lastUpdate.split(' ').slice(1, 5).join(' ');
    const liveReloadMeta = (
      <div className='clearfix meta'>
        <div className='pull-right'>
          <div className='clearfix meta-data'>
            <div className='pull-left reload-circle'> Live Reload Enabled </div>
            <div className='pull-left'><Glyphicon glyph='refresh'/> Last Update: {lastUpdateTime}</div>
          </div>
        </div>
      </div>
    );
    const metaHtml = this._isLiveReloadEnabled ? liveReloadMeta : null;

    return (
      <div>
        {metaHtml}
        <pre>{capturedOut}</pre>
      </div>
    );
  }
}

export {CapturedOutView};
