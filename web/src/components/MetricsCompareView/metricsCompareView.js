import React, {Component} from 'react';
import PropTypes from 'prop-types';
import './metricsCompareView.scss';
import Multiselect from 'react-bootstrap-multiselect';
import {Well, Alert, Button} from 'react-bootstrap';
import Select from 'react-select';
import backend from '../Backend/backend';
import {parseServerError, getAllPaths, getOption} from '../Helpers/utils';
import {MetricsPlotView} from '../MetricsPlotView/metricsPlotView';
import {ProgressWrapper} from '../Helpers/hoc';

class MetricsCompareView extends Component {
  static propTypes = {
    runIds: PropTypes.arrayOf(Number).isRequired,
    isSelected: PropTypes.bool.isRequired
  };

  runIdOptionsDomNode = null;

  constructor(props) {
    super(props);
    this.state = {
      isLoadingRuns: false,
      metrics: [],
      runIdOptions: [],
      error: '',
      metricLabels: ['_id'],
      metricLabelOptions: []
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
      // Populate run with only required columns
      backend.get('api/v1/Metrics', {
        params: {
          query: queryString,
          populate: {
            path: 'run',
            select: ['-captured_out',
              '-meta',
              '-heartbeat',
              '-result',
              '-start_time',
              '-stop_time',
              '-resources',
              '-artifacts',
              '-format',
              '-command',
              '-info.metrics',
              '-experiment.sources']}
        }
      }).then(response => {
        // Recursively get all paths for populating select options for metric label
        const paths = response.data.reduce((acc, current) => {
          const keys = getAllPaths('', current.run[0], true);
          return [...new Set([...acc, ...keys])];
        }, []);
        const metricLabelOptions = paths.map(value => ({
          label: value,
          value
        }));
        this.setState({
          metrics: response.data,
          metricLabelOptions,
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

  _handleMetricLabelChange = index => ({value}) => {
    this.setState(({metricLabels}) => {
      const metricLabelsClone = [...metricLabels];
      metricLabelsClone[index] = value;
      return {metricLabels: metricLabelsClone};
    });
  };

  _handleAddLabel = () => {
    // Add run id as default metric label
    this.setState(({metricLabels}) => ({
      metricLabels: [...metricLabels, '_id']
    }));
  };

  _handleDeleteLabel = index => () => {
    this.setState(({metricLabels}) => {
      const metricLabelsClone = [...metricLabels].filter((_label, i) => index !== i);
      return {metricLabels: metricLabelsClone};
    });
  };

  render() {
    const {metrics, isLoadingRuns, runIdOptions, error, metricLabels, metricLabelOptions} = this.state;
    const selectedRunIds = this._getSelectedRunIds(runIdOptions);
    const metricsResponseForPlot = metrics.filter(metric => selectedRunIds.includes(metric.run_id));
    const errorAlert = error ? <Alert bsStyle='danger'>{error}</Alert> : '';

    const metricLabelsDom = metricLabels.map((label, index) => {
      const selectTestAttr = `select-metric-label-${index}`;
      // Include separator for all selects except the last one
      const separator = metricLabels.length - 1 === index ? '' : '-';
      // Add delete button for all selects except the first one
      const deleteTestAttr = `delete-label-btn-${index}`;
      const deleteButton = index === 0 ? '' : (
        <Button className='minus-button' test-attr={deleteTestAttr} bsStyle='danger' bsSize='small' onClick={this._handleDeleteLabel(index)}>
          <span className='glyphicon glyphicon-minus' aria-hidden='true'/>
        </Button>
      );
      return (
        <span key={'metric-label-' + index}>
          <div className='metric-label-options-wrapper'>
            <Select
              className='select-metric-label'
              test-attr={selectTestAttr}
              options={metricLabelOptions}
              isLoading={isLoadingRuns}
              placeholder='Metric Label'
              value={getOption(label, metricLabelOptions)}
              onChange={this._handleMetricLabelChange(index)}
            />
          </div>
          {deleteButton}
          {separator}
        </span>
      );
    });
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
              {metricLabelsDom}
              <div className='plus-button'>
                <Button test-attr='add-label-btn' bsStyle='info' bsSize='small' onClick={this._handleAddLabel}>
                  <span className='glyphicon glyphicon-plus' aria-hidden='true'/>
                </Button>
              </div>
            </Well>
            <MetricsPlotView metricsResponse={metricsResponseForPlot} runId='' metricLabels={metricLabels}/>
          </div>
        </ProgressWrapper>
      </div>
    );
  }
}

export {MetricsCompareView};
