import React, {Component} from 'react';
import PropTypes from 'prop-types';
import './configCompareView.scss';
import * as jsondiffpatch from 'jsondiffpatch';
import 'jsondiffpatch/dist/formatters-styles/html.css';
import renderHTML from 'react-render-html';
import {toast} from 'react-toastify';
import backend from '../Backend/backend';
import {parseServerError} from '../Helpers/utils';
import {SelectRunsToCompare} from '../SelectRunsToCompare/selectRunsToCompare';

class ConfigCompareView extends Component {
  static propTypes = {
    runIds: PropTypes.arrayOf(Number).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      config1: '',
      config2: '',
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
          select: '_id,config'
        }
      })
        .then(runsResponse => {
          const runsResponseData = runsResponse.data;
          this.setState({
            config1: runsResponseData.find(data => data._id === runId1).config,
            config2: runsResponseData.find(data => data._id === runId2).config
          });
        })
        .catch(error => {
          toast.error(parseServerError(error), {autoClose: 5000});
        });
    }
  };

  render() {
    const {runIds} = this.props;
    const {runId1, runId2, config1, config2} = this.state;
    const delta = jsondiffpatch.diff(config1, config2);
    return (
      <div className='config-compare-view'>
        <SelectRunsToCompare runIds={runIds} runId1={runId1} runId2={runId2} callback={this._handleRunIdChange}/>
        {renderHTML(jsondiffpatch.formatters.html.format(delta, config1))}
      </div>
    );
  }
}

export {ConfigCompareView};
