import PropTypes from 'prop-types'
import React, { Component } from 'react';
import axios from 'axios';
import ReactJson from 'react-json-view'
import './drillDownView.scss'
import { Nav, NavItem } from 'react-bootstrap';
import { on, off } from 'dom-helpers/events';
import { capitalize } from '../Helpers/utils';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import Plot from 'react-plotly.js';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';
import { toast } from 'react-toastify';
import { xAxisValues, DRILLDOWN_VIEW, scaleValues, SCALE_VALUE } from '../../constants/drillDownView.constants';

class JsonView extends React.PureComponent {
  static propTypes = {
    data: PropTypes.object
  };

  render() {
    const {data} = this.props;
    return (<ReactJson src={data} iconStyle="circle" collapsed={1} collapseStringsAfterLength={40}
                       enableClipboard={false} displayDataTypes={false} />);
  }
}

class DrillDownView extends Component {
  static propTypes = {
    height: PropTypes.number,
    runId: PropTypes.number,
    width: PropTypes.number
  };

  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['selectedNavTab']
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedNavTab: DRILLDOWN_VIEW.METRICS,
      isTableLoading: false,
      runsResponse: null,
      metricsResponse: null,
      selectedMetricNames: new Set(),
      selectedXAxis: xAxisValues[0],
      selectedYAxis: scaleValues[0]
    };
  }

  _handleSelectNavPill = (selectedKey) => {
    this.setState({
      selectedNavTab: selectedKey
    });
  };

  _stopWheel = event => {
    const {scrollTop, scrollHeight, clientHeight} = this.scrollableDiv;
    const maxScrollTop = scrollHeight - clientHeight;
    const scrollingUp = event.deltaY < 0;
    const scrollingDown = event.deltaY > 0;
    // Handle event only if scrolling up or down
    if (scrollingUp || scrollingDown) {
      // Stop event propagation to allow DrillDownView content to scroll
      if ((scrollTop > 0 && (scrollTop < maxScrollTop || scrollingUp)) || (scrollTop === 0 && maxScrollTop > 0 && scrollingDown)) {
        event.stopPropagation();
      }
    }
    if (this.state.selectedNavTab === DRILLDOWN_VIEW.CAPTURED_OUT) {
      // Stop event propagation for horizontal scroll to allow CAPTURED_OUT content to be scrolled
      if (event.deltaX !== 0) {
        event.stopPropagation();
      }
    }
  };

  componentWillMount() {
    const {runId} = this.props;
    if (runId) {
      this.setState({
        isTableLoading: true
      });
      axios.all([
        axios.get(`/api/v1/Runs/${runId}`, {
          params: {
            select: 'captured_out,info,meta,host,experiment'
          }
        }),
        axios.get('/api/v1/Metrics', {
          params: {
            query: `{"run_id":"${runId}"}`
          }
        })
      ])
      .then(axios.spread((runsResponse, metricsResponse) => {
        const runsResponseData = runsResponse.data;
        const metricsResponseData = metricsResponse.data;
        this.setState({
          isTableLoading: false,
          runsResponse: runsResponseData,
          metricsResponse: metricsResponseData
        });
      }))
      .catch(error => {
        this.setState({isTableLoading: false});
        toast.error(parseServerError(error));
      });
    }
  }

  componentDidMount() {
    on(this.scrollableDiv, 'wheel', this._stopWheel);
  }

  componentWillUnmount() {
    off(this.scrollableDiv, 'wheel', this._stopWheel);
  }

  _handleXAxisChange = (event) => {
    this.setState({
      selectedXAxis: event.target.value
    });
  };

  _handleYAxisChange = (event) => {
    this.setState({
      selectedYAxis: event.target.value
    });
  };

  _handleMetricNamesChange = (event) => {
    const {selectedMetricNames} = this.state;
    const value = event.target.value;
    if (event.target.checked) {
      selectedMetricNames.add(value);
    } else {
      selectedMetricNames.delete(value);
    }
    this.setState({
      selectedMetricNames
    })
  };

  getMetricsPlot() {
    const {metricsResponse, selectedMetricNames, selectedXAxis, selectedYAxis} = this.state;
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
                <div key={i} className="checkbox">
                  <label>
                    <input test-attr={"plot-metric-name-" + i} type="checkbox" value={metricName} checked={selectedMetricNames.has(metricName)} onChange={this._handleMetricNamesChange}/>
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
                <div key={i} className="radio">
                  <label>
                    <input test-attr={"plot-x-axis-" + i} type="radio" name="x-axis" value={value} checked={selectedXAxis === value} onChange={this._handleXAxisChange} />
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
                <div key={i} className="radio">
                  <label>
                    <input test-attr={"plot-y-axis-" + i} type="radio" name="y-axis" value={value} checked={selectedYAxis === value} onChange={this._handleYAxisChange} />
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

  render () {
    const {selectedNavTab, isTableLoading, runsResponse} = this.state;
    const {width, height, runId} = this.props;
    const experimentName = runsResponse !== null && 'experiment' in runsResponse ? runsResponse.experiment.name : '';
    // Adjust the width of scrollbar from total width
    const style = {
      height: height,
      width: width - 17,
    };
    const getTabContent = (key) => {
      let content = '';
      if (runsResponse) {
        switch (key) {
          case DRILLDOWN_VIEW.EXPERIMENT:
            content = <div id={DRILLDOWN_VIEW.EXPERIMENT}><JsonView data={runsResponse.experiment}/></div>;
            break;
          case DRILLDOWN_VIEW.HOST_INFO:
            content = <div id={DRILLDOWN_VIEW.HOST_INFO}><JsonView data={runsResponse.host}/></div>;
            break;
          case DRILLDOWN_VIEW.RUN_INFO:
            content = <div id={DRILLDOWN_VIEW.RUN_INFO}><JsonView data={runsResponse.info}/></div>;
            break;
          case DRILLDOWN_VIEW.CAPTURED_OUT:
            content = <div id={DRILLDOWN_VIEW.CAPTURED_OUT}><pre>{runsResponse.captured_out}</pre></div>;
            break;
          case DRILLDOWN_VIEW.META_INFO:
            content = <div id={DRILLDOWN_VIEW.META_INFO}><JsonView data={runsResponse.meta}/></div>;
            break;
          case DRILLDOWN_VIEW.METRICS:
            content = <div id={DRILLDOWN_VIEW.METRICS}>{this.getMetricsPlot()}</div>;
            break;
          default:
        }
      }
      return <ProgressWrapper loading={isTableLoading}>{content}</ProgressWrapper>;
    };
    return(
      <div style={style}>
        <nav className="navbar navbar-light">
          <span className="navbar-brand">Details for: <strong>{experimentName}</strong> (Id: {runId}) </span>
        </nav>
        <div className="sidebar-wrapper">
          <div className="sidebar-container full-height">
            <div id="sidebar">
              <Nav bsStyle="pills" stacked activeKey={selectedNavTab} onSelect={this._handleSelectNavPill}>
                <NavItem eventKey={DRILLDOWN_VIEW.METRICS}>
                  Metrics Plot
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.CAPTURED_OUT}>
                  Captured Out
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.EXPERIMENT}>
                  Experiment Details
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.HOST_INFO}>
                  Host Info
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.RUN_INFO}>
                  Run Info
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.META_INFO}>
                  Meta Info
                </NavItem>
              </Nav>
            </div>
          </div>
          <div className="sidebar-content full-height">
            <div className="tab-content" ref={div => (this.scrollableDiv = div || this.scrollableDiv)}>
              {getTabContent(selectedNavTab)}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

reactMixin(DrillDownView.prototype, LocalStorageMixin);
export {DrillDownView};
