import React, {Component} from 'react';
import { SCALE_VALUE, SCALE_VALUES, X_AXIS_VALUES } from '../../appConstants/drillDownView.constants';
import { capitalize } from '../Helpers/utils';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types'
import reactMixin from 'react-mixin';
import Slider from 'rc-slider';
import LocalStorageMixin from 'react-localstorage';

const DEFAULT_SELECTION_KEY = "MetricsPlotView|default";
const DEFAULT_PLOT_WIDTH = 800;
const DEFAULT_PLOT_HEIGHT = 400;
const DEFAULT_PLOT_SMOOTHING = 0;

class MetricsPlotView extends Component {
  static propTypes = {
    metricsResponse: PropTypes.array,
    runId: PropTypes.any
  };

  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['selectedMetricNames', 'selectedXAxis', 'selectedYAxis', 'plotWidth', 'plotHeight', 'smoothing']
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedMetricNames: [],
      selectedXAxis: X_AXIS_VALUES[0],
      selectedYAxis: SCALE_VALUES[0],
      smoothing: DEFAULT_PLOT_SMOOTHING,
      plotWidth: DEFAULT_PLOT_WIDTH,
      plotHeight: DEFAULT_PLOT_HEIGHT
    };
  }

  _handleXAxisChange = (event) => {
    const value = event.target.value;
    this.setState({
      selectedXAxis: value
    });
    // update local storage
    this._updateDefaultSelection({selectedXAxis: value});
  };

  _handleYAxisChange = (event) => {
    const value = event.target.value;
    this.setState({
      selectedYAxis: value
    });
    // update local storage
    this._updateDefaultSelection({selectedYAxis: value});
  };

  _handleMetricNamesChange = (event) => {
    const {selectedMetricNames} = this.state;
    let newMetricNames = Object.assign([], selectedMetricNames);
    const value = event.target.value;
    if (event.target.checked) {
      if (!newMetricNames.includes(value)) {
        newMetricNames.push(value);
      }
    } else {
      newMetricNames = newMetricNames.filter(metricName => metricName !== value);
    }
    this.setState({
      selectedMetricNames: newMetricNames
    });
    // update local storage
    this._updateDefaultSelection({selectedMetricNames: newMetricNames});
  };

  /**
   * Update the default selection of metrics plot in local storage
   * @param selection
   * @private
   */
  _updateDefaultSelection = (selection) => {
    const value = Object.assign({}, JSON.parse(localStorage.getItem(DEFAULT_SELECTION_KEY)), selection);
    localStorage.setItem(DEFAULT_SELECTION_KEY, JSON.stringify(value));
  };

  _setDefaultSelection = () => {
    const defaultSelection = JSON.parse(localStorage.getItem(DEFAULT_SELECTION_KEY));
    if (defaultSelection) {
      const metricNames = this.props.metricsResponse.map(metric => metric.name);
      const selectedMetricNames = defaultSelection.selectedMetricNames ? defaultSelection.selectedMetricNames.filter(name => metricNames.includes(name)) : [];
      this.setState({
        selectedMetricNames,
        selectedXAxis: defaultSelection.selectedXAxis || X_AXIS_VALUES[0],
        selectedYAxis: defaultSelection.selectedYAxis || SCALE_VALUES[0],
        plotWidth: defaultSelection.plotWidth || DEFAULT_PLOT_WIDTH,
        plotHeight: defaultSelection.plotHeight || DEFAULT_PLOT_HEIGHT,
        smoothing: defaultSelection.smoothing || DEFAULT_PLOT_SMOOTHING
      });
    }
  };

  componentDidMount() {
    this._setDefaultSelection();
  }

  _plotWidthChangeHandler = (value) => {
    this.setState({
      plotWidth: value
    });
    // update local storage to set default width
    this._updateDefaultSelection({plotWidth: value});
  };

  _plotHeightChangeHandler = (value) => {
    this.setState({
      plotHeight: value
    });
    // update local storage to set default height
    this._updateDefaultSelection({plotHeight: value});
  };

  _plotSmoothingChangeHandler = (value) => {
    this.setState({
      smoothing: value
    });
    // update local storage to set default height
    this._updateDefaultSelection({smoothing: value});
  };

  render() {
    const {metricsResponse, runId} = this.props;
    const {selectedMetricNames, selectedXAxis, selectedYAxis, plotWidth, plotHeight, smoothing} = this.state;
    let metricsResponseMap = {},
      metricNames = [];
    if (metricsResponse && metricsResponse.length) {
      metricsResponseMap = metricsResponse.reduce((map, metric) => {
        map[metric.name] = metric;
        return map;
      }, {});
      metricNames = Object.keys(metricsResponseMap);
    }
    if (!metricNames.length) {
      return (
        <div className="alert alert-warning">No metrics are available to plot</div>
      )
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
    ]

    const plotData = Array.from(selectedMetricNames).reduce((r, metricName) => {
      // original data
      let colorindex = (r.length / 2) % colors.length
      r.push({
        type: 'scatter',
        mode: 'lines+points',
        name: metricName + '.unsmoothed',
        x: metricsResponseMap[metricName][selectedXAxis],
        y: metricsResponseMap[metricName]['values'],
        opacity: 0.2,
        marker: {color: colors[colorindex]},
        showlegend: false,
        hoverinfo: 'none'
      });

      // calculate smoothed graph
      let smoothed = []
      let ravg = metricsResponseMap[metricName]['values'][0]
      for (let v of metricsResponseMap[metricName]['values']) {
        ravg = ravg * smoothing + (1 - smoothing) * v
        smoothed.push(ravg)
      }

      // smoothed data
      r.push({
        type: 'scatter',
        mode: 'lines+points',
        name: metricName,
        x: metricsResponseMap[metricName][selectedXAxis],
        y: smoothed,
        opacity: 1,
        marker: {color: colors[colorindex]}
      });

      return r;
    }, []);

    const yAxisLayout = selectedYAxis === SCALE_VALUE.LOGARITHMIC ? {type: 'log', autorange: true} : {};
    const wrapperStyle = { width: 120, margin: 0 };

    return (
      <div>
        <div className="metrics-plot-left">
          <h4>Metrics to plot</h4>
          <div id="plot-metric-names">
            {metricNames.map( (metricName, i) => {
              return (
                <div key={"MetricName" + runId + i} className="checkbox">
                  <label>
                    <input test-attr={"plot-metric-name-" + i} type="checkbox" value={metricName} checked={selectedMetricNames.includes(metricName)} onChange={this._handleMetricNamesChange}/>
                    {metricName}
                  </label>
                </div>
              )
            })}
          </div>
          <h4>X-Axis Type</h4>
          <div id="plot-x-axis-types">
            {X_AXIS_VALUES.map( (value, i) => {
              return (
                <div key={"XAxisPlot" + runId + i} className="radio">
                  <label>
                    <input test-attr={"plot-x-axis-" + i} key={"XAxisPlotInput" + runId + i} type="radio" value={value} checked={selectedXAxis === value} onChange={this._handleXAxisChange} />
                    {capitalize(value)}
                  </label>
                </div>
              )
            })}
          </div>
          <h4>Y-Axis Type</h4>
          <div id="plot-y-axis-types">
            {SCALE_VALUES.map( (value, i) => {
              return (
                <div key={"YAxisPlot" + runId + i} className="radio">
                  <label>
                    <input test-attr={"plot-y-axis-" + i} key={"YAxisPlotInput" + runId + i} type="radio" value={value} checked={selectedYAxis === value} onChange={this._handleYAxisChange} />
                    {capitalize(value)}
                  </label>
                </div>
              )
            })}
          </div>
          <div style={wrapperStyle}>
            <div>Smoothing: {smoothing}</div>
            <Slider test-attr={"plot-smoothing-slider"} min={0} max={0.99} value={smoothing} step={0.001} onChange={this._plotSmoothingChangeHandler}/>
          </div>
          <h4>Plot Size</h4>
          <div id="plot-size">
            <div style={wrapperStyle}>
              <div>Width: {plotWidth}px</div>
              <Slider test-attr={"plot-width-slider"} min={700} max={1200} value={plotWidth} step={50} onChange={this._plotWidthChangeHandler}/>
            </div>
            <div style={wrapperStyle}>
              <div>Height: {plotHeight}px</div>
              <Slider test-attr={"plot-height-slider"} min={300} max={600} value={plotHeight} step={50} onChange={this._plotHeightChangeHandler}/>
            </div>
          </div>
        </div>
        <div className="metrics-plot-content">
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
