import React, {Component} from 'react';
import PropTypes from 'prop-types';
import './metricsCompareView.scss';
import axios from 'axios';
import Multiselect from 'react-bootstrap-multiselect';
import {Well, Alert} from 'react-bootstrap';
import Select from 'react-select';
import {parseServerError} from '../Helpers/utils';
import {MetricsPlotView} from '../MetricsPlotView/metricsPlotView';
import {ProgressWrapper} from '../Helpers/hoc';

class MetricsCompareView extends Component {
  static propTypes = {
    runIds: PropTypes.arrayOf(Number).isRequired,
    isSelected: PropTypes.bool.isRequired
  };

  runIdOptionsDomNode = null;

  metricLabelOptions = [{
    label: 'Run Id',
    value: '_id'
  }, {
    label: 'Experiment Name',
    value: 'experiment.name'
  }];

  constructor(props) {
    super(props);
    this.state = {
      isLoadingRuns: false,
      metrics: [],
      runIdOptions: [],
      error: '',
      metricLabel: '_id'
    };
  }

  _initializeState = () => {
    this._loadData();
    this._populateRunIdOptions();
  };

  componentDidMount() {
    const {isSelected} = this.props;
    if (isSelected) {
      // Load data only when the component is being displayed
      this._initializeState();
    }
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    // Populate runId options every time runIds change
    const {runIds, isSelected} = this.props;
    if (JSON.stringify(prevProps.runIds) !== JSON.stringify(runIds) && isSelected) {
      this._initializeState();
    }
  }

  _populateRunIdOptions = () => {
    const {runIds} = this.props;
    const runIdOptions = runIds.map(runId => {
      return {
        label: runId,
        value: runId,
        selected: true
      };
    });
    this.setState({
      runIdOptions
    });
  };

  _getSelectedRunIds = runIdOptions => runIdOptions.filter(option => option.selected === true)
    .map(option => Number(option.value));

  _handleRunIdsChange = _e => {
    const runIds = this.runIdOptionsDomNode.$multiselect.val();
    this.setState(({runIdOptions}) => ({
      runIdOptions: runIdOptions.map(option => {
        option.selected = runIds.includes(String(option.value));
        return option;
      })
    }));
  };

  _loadData = () => {
    const {runIds} = this.props;
    if (runIds.length >= 2) {
      this.setState({
        isLoadingRuns: true,
        error: ''
      });
      const queryString = JSON.stringify({
        run_id: {
          $in: runIds
        }
      });
      axios.get('/api/v1/Metrics', {
        params: {
          query: queryString,
          populate: 'run'
        }
      }).then(response => {
        this.setState({
          metrics: response.data,
          isLoadingRuns: false
        });
      }).catch(error => {
        const message = parseServerError(error);
        this.setState({
          isLoadingRuns: false,
          error: message
        });
      });
    } else {
      this.setState({
        error: 'At-least two runs should be selected for comparison'
      });
    }
  };

  _handleMetricLabelChange = ({value}) => {
    this.setState({
      metricLabel: value
    });
  };

  render() {
    const {metrics, isLoadingRuns, runIdOptions, error, metricLabel} = this.state;
    const selectedRunIds = this._getSelectedRunIds(runIdOptions);
    const metricsResponseForPlot = metrics.filter(metric => selectedRunIds.includes(metric.run_id));
    const errorAlert = error ? <Alert bsStyle='danger'>{error}</Alert> : '';
    const getOption = value => {
      return this.metricLabelOptions.find(option => option.value === value);
    };

    return (
      <div className='metrics-compare-view'>
        <ProgressWrapper id='metrics-compare-progress-wrapper' loading={isLoadingRuns}>
          <div>
            {errorAlert}
            <Well bsSize='small' className='run-id-filter-well'>
              <h5>Runs: </h5>
              <div className='run-id-options-wrapper'>
                <Multiselect
                  ref={el => this.runIdOptionsDomNode = el}
                  includeSelectAllOption multiple
                  enableHTML
                  buttonText={(options, _select) => {
                    if (options.length === 0) {
                      return 'None selected';
                    }

                    return `${options.length} selected`;
                  }}
                  selectedClass='run-id-selected'
                  id='run_ids'
                  maxHeight={300}
                  data={runIdOptions}
                  onSelectAll={this._handleRunIdsChange}
                  onChange={this._handleRunIdsChange}
                  onDeselectAll={this._handleRunIdsChange}
                />
              </div>

              <h5>Metric Label: </h5>
              <div className='metric-label-options-wrapper'>
                <Select
                  className='select-metric-label'
                  test-attr='select-metric-label'
                  options={this.metricLabelOptions}
                  placeholder='Metric Label'
                  value={getOption(metricLabel)}
                  onChange={this._handleMetricLabelChange}
                />
              </div>
            </Well>
            <MetricsPlotView metricsResponse={metricsResponseForPlot} runId='' metricLabel={metricLabel}/>
          </div>
        </ProgressWrapper>
      </div>
    );
  }
}

export {MetricsCompareView};
