import React, {Component} from 'react';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import Slider from 'rc-slider';
import LocalStorageMixin from 'react-localstorage';
import Multiselect from 'react-bootstrap-multiselect';
import NumericInput from 'react-numeric-input';
import {capitalize, resolveObjectPath} from '../Helpers/utils';
import {SCALE_VALUE, SCALE_VALUES, X_AXIS_VALUES} from '../../appConstants/drillDownView.constants';
import './metricsPlotView.scss';

const DEFAULT_SELECTION_KEY = 'MetricsPlotView|default';
const DEFAULT_PLOT_WIDTH = 800;
const DEFAULT_PLOT_HEIGHT = 400;
const DEFAULT_PLOT_SMOOTHING = 0;

class MetricsPlotView extends Component {
  static propTypes = {
    metricsResponse: PropTypes.array,
    runId: PropTypes.any,
    metricLabel: PropTypes.string
  };

  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['selectedMetricNames', 'selectedXAxis', 'selectedYAxis', 'plotWidth', 'plotHeight', 'smoothing']
  };

  metricNameOptionsDomNode = null;

  constructor(props) {
    super(props);
    this.state = {
      selectedXAxis: X_AXIS_VALUES[0],
      selectedYAxis: SCALE_VALUES[0],
      smoothing: DEFAULT_PLOT_SMOOTHING,
      plotWidth: DEFAULT_PLOT_WIDTH,
      plotHeight: DEFAULT_PLOT_HEIGHT,
      metricNameOptions: []
    };
  }

  _handleXAxisChange = event => {
    const {value} = event.target;
    this.setState({
      selectedXAxis: value
    });
    // Update local storage
    this._updateDefaultSelection({selectedXAxis: value});
  };

  _handleYAxisChange = event => {
    const {value} = event.target;
    this.setState({
      selectedYAxis: value
    });
    // Update local storage
    this._updateDefaultSelection({selectedYAxis: value});
  };

  /**
   * Update the default selection of metrics plot in local storage
   * @param {object} selection the default axis and type selection
   * @private
   */
  _updateDefaultSelection = selection => {
    const value = {...JSON.parse(localStorage.getItem(DEFAULT_SELECTION_KEY)), ...selection};
    localStorage.setItem(DEFAULT_SELECTION_KEY, JSON.stringify(value));
  };

  _setDefaultSelection = () => {
    const defaultSelection = JSON.parse(localStorage.getItem(DEFAULT_SELECTION_KEY));
    const metricNames = this.props.metricsResponse.map(metric => metric.name);
    if (defaultSelection) {
      this.setState({
        selectedXAxis: defaultSelection.selectedXAxis || X_AXIS_VALUES[0],
        selectedYAxis: defaultSelection.selectedYAxis || SCALE_VALUES[0],
        plotWidth: defaultSelection.plotWidth || DEFAULT_PLOT_WIDTH,
        plotHeight: defaultSelection.plotHeight || DEFAULT_PLOT_HEIGHT,
        smoothing: defaultSelection.smoothing || DEFAULT_PLOT_SMOOTHING
      });
    }

    const selectedMetricNames = defaultSelection && defaultSelection.metricNameOptions ?
      this._getSelectedMetrics(defaultSelection.metricNameOptions) : [];
    const metricNameOptions = [...new Set(metricNames)].map(metricName => {
      // Select all metrics by default
      const selected = selectedMetricNames.length > 0 ? selectedMetricNames.includes(metricName) : true;
      return {label: metricName, value: metricName, selected};
    });

    this.setState({
      metricNameOptions
    });
  };

  componentDidMount() {
    this._setDefaultSelection();
  }

  _plotWidthChangeHandler = value => {
    this.setState({
      plotWidth: value
    });
    // Update local storage to set default width
    this._updateDefaultSelection({plotWidth: value});
  };

  _plotHeightChangeHandler = value => {
    this.setState({
      plotHeight: value
    });
    // Update local storage to set default height
    this._updateDefaultSelection({plotHeight: value});
  };

  _plotSmoothingChangeHandler = value => {
    this.setState({
      smoothing: value
    });
    // Update local storage to set default smoothing
    this._updateDefaultSelection({smoothing: value});
  };

  _getSelectedMetrics = metricNameOptions => metricNameOptions.filter(option => option.selected === true)
    .map(option => option.value);

  _handleMetricNamesChange = _e => {
    const selectedMetricNames = this.metricNameOptionsDomNode.$multiselect.val();

    this.setState(({metricNameOptions}) => ({
      metricNameOptions: metricNameOptions.map(option => {
        option.selected = selectedMetricNames.includes(option.value);
        return option;
      })
    }), () => {
      // Update local storage
      this._updateDefaultSelection({metricNameOptions: this.state.metricNameOptions});
    });
  };

  render() {
    const {metricsResponse, runId, metricLabel} = this.props;
    const {selectedXAxis, selectedYAxis, plotWidth, plotHeight, smoothing, metricNameOptions} = this.state;
    let metricsResponseMap = {};
    let metricNames = [];
    const distinctRuns = [...new Set(metricsResponse.map(metric => metric.run_id))];
    const runMap = {};
    if (metricsResponse && metricsResponse.length > 0) {
      metricsResponseMap = metricsResponse.reduce((map, metric) => {
        // Display run id with metric name while showing plot with multiple runs
        const metricNameLabel = metricLabel && 'run' in metric && metric.run.length > 0 ?
          `${resolveObjectPath(metric.run[0], metricLabel, metric.run_id)}.${metric.name}` :
          `${metric.run_id}.${metric.name}`;
        const metricName = distinctRuns.length > 1 ?
          metricNameLabel : metric.name;
        runMap[metric.run_id] = 'run' in metric && metric.run.length > 0 ? metric.run[0] : {};
        map[metricName] = metric;
        return map;
      }, {});
      metricNames = Object.keys(metricsResponseMap);
    }

    if (!metricNames.length > 0) {
      return (
        <div className='alert alert-warning'>No metrics are available to plot</div>
      );
    }

    const colors = [
      '#1f77b4',
      '#ff7f0e',
      '#2ca02c',
      '#d62728',
      '#9467bd',
      '#8c564b',
      '#e377c2',
      '#7f7f7f',
      '#bcbd22',
      '#17becf'
    ];

    const selectedMetricNames = this._getSelectedMetrics(metricNameOptions);
    const plotData = [...selectedMetricNames].reduce((r, metricName) => {
      distinctRuns.forEach((runId, i) => {
        const metricNameLabel = metricLabel && runId in runMap ?
          `${resolveObjectPath(runMap[runId], metricLabel, runId)}.${metricName}` : `${runId}.${metricName}`;
        const metricNameKey = distinctRuns.length > 1 ? metricNameLabel : metricName;
        // Original data
        const colorindex = ((r.length / 2) + i) % colors.length;
        if (metricsResponseMap[metricNameKey]) {
          r.push({
            type: 'scatter',
            mode: 'lines+points',
            name: metricNameKey + '.unsmoothed',
            x: metricsResponseMap[metricNameKey][selectedXAxis],
            y: metricsResponseMap[metricNameKey].values,
            opacity: 0.2,
            marker: {color: colors[colorindex]},
            showlegend: false,
            hoverinfo: 'none'
          });

          // Calculate smoothed graph
          const smoothed = [];
          let ravg = metricsResponseMap[metricNameKey].values[0];
          metricsResponseMap[metricNameKey].values.forEach(v => {
            ravg = (ravg * smoothing) + ((1 - smoothing) * v);
            smoothed.push(ravg);
          });

          // Smoothed data
          r.push({
            type: 'scatter',
            mode: 'lines+points',
            name: metricNameKey,
            x: metricsResponseMap[metricNameKey][selectedXAxis],
            y: smoothed,
            opacity: 1,
            marker: {color: colors[colorindex]}
          });
        }
      });
      return r;
    }, []);

    const yAxisLayout = selectedYAxis === SCALE_VALUE.LOGARITHMIC ? {type: 'log', autorange: true} : {};
    const wrapperStyle = {width: 120, margin: 0};

    return (
      <div className='metrics-plot-view'>
        <div className='metrics-plot-left'>
          <h5>Metrics to plot</h5>
          <div id='plot-metric-names'>
            <Multiselect
              ref={el => this.metricNameOptionsDomNode = el}
              includeSelectAllOption multiple
              enableHTML
              buttonText={(options, _select) => {
                if (options.length === 0) {
                  return 'None selected';
                }

                return `${options.length} selected`;
              }}
              selectedClass='metric-name-selected'
              id='metric_names'
              maxHeight={300}
              data={metricNameOptions}
              onSelectAll={this._handleMetricNamesChange}
              onChange={this._handleMetricNamesChange}
              onDeselectAll={this._handleMetricNamesChange}
            />
          </div>
          <h5>X-Axis Type</h5>
          <div id='plot-x-axis-types'>
            {X_AXIS_VALUES.map((value, i) => {
              return (
                <div key={'XAxisPlot' + runId + i} className='radio'>
                  <label>
                    <input key={'XAxisPlotInput' + runId + i} test-attr={'plot-x-axis-' + i} type='radio' value={value} checked={selectedXAxis === value} onChange={this._handleXAxisChange}/>
                    {capitalize(value)}
                  </label>
                </div>
              );
            })}
          </div>
          <h5>Y-Axis Type</h5>
          <div id='plot-y-axis-types'>
            {SCALE_VALUES.map((value, i) => {
              return (
                <div key={'YAxisPlot' + runId + i} className='radio'>
                  <label>
                    <input key={'YAxisPlotInput' + runId + i} test-attr={'plot-y-axis-' + i} type='radio' value={value} checked={selectedYAxis === value} onChange={this._handleYAxisChange}/>
                    {capitalize(value)}
                  </label>
                </div>
              );
            })}
          </div>
          <div className='smoothing-wrapper'>
            <div>Smoothing: <NumericInput className='smoothing-input' min={0} max={0.999} step={0.001} value={smoothing} onChange={this._plotSmoothingChangeHandler}/></div>
            <Slider className='smoothing-slider' test-attr='plot-smoothing-slider' min={0} max={0.999} value={smoothing} step={0.001} onChange={this._plotSmoothingChangeHandler}/>
          </div>
          <h5>Plot Size</h5>
          <div id='plot-size'>
            <div style={wrapperStyle}>
              <div>Width: {plotWidth}px</div>
              <Slider test-attr='plot-width-slider' min={700} max={1200} value={plotWidth} step={50} onChange={this._plotWidthChangeHandler}/>
            </div>
            <div style={wrapperStyle}>
              <div>Height: {plotHeight}px</div>
              <Slider test-attr='plot-height-slider' min={300} max={600} value={plotHeight} step={50} onChange={this._plotHeightChangeHandler}/>
            </div>
          </div>
        </div>
        <div className='metrics-plot-content'>
          <Plot
            data={plotData}
            layout={{
              width: plotWidth,
              height: plotHeight,
              title: 'Metrics Plot',
              yaxis: yAxisLayout
            }}
          />
        </div>
      </div>
    );
  }
}

reactMixin(MetricsPlotView.prototype, LocalStorageMixin);
export {MetricsPlotView};
