import React, {Component} from "react";
import { SCALE_VALUE, scaleValues, xAxisValues } from "../../constants/drillDownView.constants";
import { capitalize } from "../Helpers/utils";
import Plot from "react-plotly.js";
import PropTypes from 'prop-types'
import reactMixin from "react-mixin";
import LocalStorageMixin from "react-localstorage";

const DEFAULT_SELECTION_KEY = "MetricsPlotView|default";

class MetricsPlotView extends Component {
  static propTypes = {
    metricsResponse: PropTypes.array,
    runId: PropTypes.any
  };

  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['selectedMetricNames', 'selectedXAxis', 'selectedYAxis']
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedMetricNames: [],
      selectedXAxis: xAxisValues[0],
      selectedYAxis: scaleValues[0]
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
        selectedXAxis: defaultSelection.selectedXAxis || '',
        selectedYAxis: defaultSelection.selectedYAxis || ''
      });
    }
  };

  componentDidMount() {
    this._setDefaultSelection();
  }

  render() {
    const {metricsResponse, runId} = this.props;
    const {selectedMetricNames, selectedXAxis, selectedYAxis} = this.state;
    let metricsResponseMap = {},
      metricNames = [];
    if (metricsResponse && metricsResponse.length) {
      metricsResponseMap = metricsResponse.reduce((map = {}, metric) => {
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
    const plotData = Array.from(selectedMetricNames).map(metricName => {
      return {
        type: 'scatter',
        mode: 'lines+points',
        name: metricName,
        x: metricsResponseMap[metricName][selectedXAxis],
        y: metricsResponseMap[metricName]['values']
      };
    });
    const yAxisLayout = selectedYAxis === SCALE_VALUE.LOGARITHMIC ? {type: 'log', autorange: true} : {};
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
            {xAxisValues.map( (value, i) => {
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
            {scaleValues.map( (value, i) => {
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
        </div>
        <div className="metrics-plot-content">
          <Plot
            data={plotData}
            layout={{
              width: 700,
              height: 300,
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
