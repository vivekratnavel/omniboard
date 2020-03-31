import React, {Component} from 'react';
import PropTypes from 'prop-types';
import './capturedOutCompareView.scss';
import {toast} from 'react-toastify';
import ReactDiffViewer from 'react-diff-viewer';
import backend from '../Backend/backend';
import {parseServerError} from '../Helpers/utils';
import {SelectRunsToCompare} from '../SelectRunsToCompare/selectRunsToCompare';

class CapturedOutCompareView extends Component {
  static propTypes = {
    runIds: PropTypes.arrayOf(Number).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      capturedOut1: '',
      capturedOut2: '',
      runId1: '',
      runId2: ''
    };
  }

  _initializeState = () => {
    const {runIds} = this.props;
    this.setState({
      runId1: String(runIds[0]),
      runId2: String(runIds[1])
    }, this._loadData);
  };

  componentDidMount() {
    const {runIds} = this.props;
    if (runIds && runIds.length >= 2) {
      this._initializeState();
    }
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    // Populate runId options every time runIds change
    const {runIds} = this.props;
    if (JSON.stringify(prevProps.runIds) !== JSON.stringify(runIds) && runIds.length >= 2) {
      this._initializeState();
    }
  }

  _handleRunIdChange = runId => {
    return selectedOption => {
      this.setState({
        [runId]: selectedOption.value
      }, this._loadData);
    };
  };

  _loadData = () => {
    let {runId1, runId2} = this.state;
    runId1 = Number(runId1);
    runId2 = Number(runId2);
    if (runId1 > 0 && runId2 > 0) {
      const queryString = JSON.stringify({
        _id: {
          $in: [runId1, runId2]
        }
      });
      backend.get('api/v1/Runs', {
        params: {
          query: queryString,
          select: '_id,captured_out'
        }
      })
        .then(runsResponse => {
          const runsResponseData = runsResponse.data;
          this.setState({
            capturedOut1: runsResponseData.find(data => data._id === runId1).captured_out,
            capturedOut2: runsResponseData.find(data => data._id === runId2).captured_out
          });
        })
        .catch(error => {
          toast.error(parseServerError(error), {autoClose: 5000});
        });
    }
  };

  render() {
    const {runIds} = this.props;
    const {capturedOut1, capturedOut2, runId1, runId2} = this.state;

    return (
      <div className='captured-out-compare-view'>
        <SelectRunsToCompare runIds={runIds} runId1={runId1} runId2={runId2} callback={this._handleRunIdChange}/>
        <ReactDiffViewer splitView oldValue={capturedOut1} newValue={capturedOut2}/>
      </div>
    );
  }
}

export {CapturedOutCompareView};
