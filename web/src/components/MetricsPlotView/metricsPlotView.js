import React, {Component} from 'react';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import Slider from 'rc-slider';
import LocalStorageMixin from 'react-localstorage';
import Multiselect from 'react-bootstrap-multiselect';
import Select from 'react-select';
import NumericInput from 'react-numeric-input';
import {capitalize, resolveObjectPath, getOption} from '../Helpers/utils';
import {SCALE_VALUE, SCALE_VALUES, X_AXIS_VALUES} from '../../appConstants/drillDownView.constants';
import './metricsPlotView.scss';

const DEFAULT_SELECTION_KEY = 'MetricsPlotView|default';
const DEFAULT_PLOT_WIDTH = 800;
const DEFAULT_PLOT_HEIGHT = 400;
const DEFAULT_PLOT_SMOOTHING = 0;
const PLOT_MODE_OPTIONS = ['lines', 'lines+markers', 'markers', 'dashdot', 'dot'];
const DEFAULT_PLOT_MODE = PLOT_MODE_OPTIONS[0];

const plotModeOptions = PLOT_MODE_OPTIONS.map(value => ({
  label: value,
  value
}));

class MetricsPlotView extends Component {
  static propTypes = {
    metricsResponse: PropTypes.array,
    runId: PropTypes.any,
    metricLabels: PropTypes.array,
    dbKey: PropTypes.string
  };

  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['selectedMetricNames', 'selectedXAxis', 'selectedYAxis', 'plotWidth', 'plotHeight', 'smoothing', 'plotModes']
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
      plotModes: [DEFAULT_PLOT_MODE, PLOT_MODE_OPTIONS[3]],
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
    const {dbKey} = this.props;
    const key = dbKey + '|' + DEFAULT_SELECTION_KEY;
    const value = {...JSON.parse(localStorage.getItem(key)), ...selection};
    localStorage.setItem(key, JSON.stringify(value));
  };

  _setDefaultSelection = () => {
    const {dbKey} = this.props;
    const key = dbKey + '|' + DEFAULT_SELECTION_KEY;
    const defaultSelection = JSON.parse(localStorage.getItem(key));
    const metricNames = this.props.metricsResponse.map(metric => metric.name);
    if (defaultSelection) {
      this.setState({
        selectedXAxis: defaultSelection.selectedXAxis || X_AXIS_VALUES[0],
        selectedYAxis: defaultSelection.selectedYAxis || SCALE_VALUES[0],
        plotWidth: defaultSelection.plotWidth || DEFAULT_PLOT_WIDTH,
        plotHeight: defaultSelection.plotHeight || DEFAULT_PLOT_HEIGHT,
        plotModes: defaultSelection.plotModes || [DEFAULT_PLOT_MODE, PLOT_MODE_OPTIONS[3]],
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

  _plotModeChangeHandler = index => ({value}) => {
    this.setState(prevState => {
      const plotModes = [...prevState.plotModes];
      plotModes[index] = value;
      return {
        plotModes
      };
    });
    // Update local storage to set default width
    this._updateDefaultSelection({plotMode: value});
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
    const {metricsResponse, runId, metricLabels} = this.props;
    const {selectedXAxis, selectedYAxis, plotWidth, plotHeight, smoothing, metricNameOptions, plotModes} = this.state;
    let metricsResponseMap = {};
    let metricNames = [];
    const distinctRuns = [...new Set(metricsResponse.map(metric => metric.run_id))];
    const runMap = {};
    // Get metric labels concatenated with a '-' separator
    const getConcatenatedLabels = (metricLabels, run) => {
      return metricLabels.reduce((result, metricLabelPath) => {
        const label = resolveObjectPath(run, metricLabelPath, 'NA');
        return `${result}${label}-`;
      }, '');
    };

    if (metricsResponse && metricsResponse.length > 0) {
      metricsResponseMap = metricsResponse.reduce((map, metric) => {
        const metricNameLabel = metricLabels && 'run' in metric && metric.run.length > 0 ?
          `${getConcatenatedLabels(metricLabels, metric.run[0])}${metric.name}` :
          `${metric.run_id}-${metric.name}`;
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
      '#0173b2',
      '#de8f05',
      '#029e73',
      '#d55e00',
      '#cc78bc',
      '#ca9161',
      '#fbafe4',
      '#949494',
      '#ece133',
      '#56b4e9'
    ];

    const selectedMetricNames = this._getSelectedMetrics(metricNameOptions);
    const plotData = [...selectedMetricNames].reduce((r, metricName) => {
      distinctRuns.forEach((runId, i) => {
        const metricNameLabel = metricLabels && runId in runMap ?
          `${getConcatenatedLabels(metricLabels, runMap[runId])}${metricName}` : `${runId}-${metricName}`;
        const metricNameKey = distinctRuns.length > 1 ? metricNameLabel : metricName;
        // Original data
        const colorindex = ((r.length / 2) + i) % colors.length;
        if (metricsResponseMap[metricNameKey]) {
          let mode = plotModes[i];
          const line = {
            dash: 'solid',
            width: 2
          };
          if (mode === PLOT_MODE_OPTIONS[3] || mode === PLOT_MODE_OPTIONS[4]) {
            line.dash = mode;
            mode = PLOT_MODE_OPTIONS[0];
          }

          r.push({
            type: 'scatter',
            mode,
            name: metricNameKey + '.unsmoothed',
            x: metricsResponseMap[metricNameKey][selectedXAxis],
            y: metricsResponseMap[metricNameKey].values,
            opacity: 0.2,
            marker: {color: colors[colorindex]},
            showlegend: false,
            hoverinfo: 'none',
            line
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
            mode,
            name: metricNameKey,
            x: metricsResponseMap[metricNameKey][selectedXAxis],
            y: smoothed,
            opacity: 1,
            marker: {color: colors[colorindex]},
            line
          });
        }
      });
      return r;
    }, []);

    const yAxisLayout = selectedYAxis === SCALE_VALUE.LOGARITHMIC ? {type: 'log', autorange: true} : {};
    const wrapperStyle = {width: 120, margin: 0};
    const plotModesDom = distinctRuns.length > 1 ? (
      <div>
        {
          distinctRuns.map((runId, index) => {
            const id = 'plot-mode-' + index;
            const testAttr = 'select-plot-mode-' + index;
            return (
              <div key={runId}>
                <h6>Plot Mode for Run {runId}</h6>
                <div id={id}>
                  <Select
                    className='select-plot-mode'
                    test-attr={testAttr}
                    options={plotModeOptions}
                    placeholder='Plot Mode'
                    value={getOption(plotModes[index], plotModeOptions)}
                    onChange={this._plotModeChangeHandler(index)}
                  />
                </div>
              </div>
            );
          })
        }
      </div>
    ) :
      (
        <div>
          <h6>Plot Mode</h6>
          <div id='plot-mode'>
            <Select
              className='select-plot-mode'
              test-attr='select-plot-mode'
              options={plotModeOptions}
              placeholder='Plot Mode'
              value={getOption(plotModes[0], plotModeOptions)}
              onChange={this._plotModeChangeHandler(0)}
            />
          </div>
        </div>
      );
    return (
      <div className='metrics-plot-view'>
        <div className='metrics-plot-left'>
          <h6>Metrics to plot</h6>
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
          <h6>X-Axis Type</h6>
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
          <h6>Y-Axis Type</h6>
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
          {plotModesDom}
          <h6>Plot Size</h6>
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
