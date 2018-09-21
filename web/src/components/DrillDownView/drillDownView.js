import PropTypes from 'prop-types'
import React, { Component } from 'react';
import axios from 'axios';
import ReactJson from 'react-json-view'
import './drillDownView.scss'
import { Nav, NavItem } from 'react-bootstrap';
import { on, off } from 'dom-helpers/events';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';
import { toast } from 'react-toastify';
import { DRILLDOWN_VIEW } from '../../constants/drillDownView.constants';
import { MetricsPlotView } from '../MetricsPlotView/metricsPlotView';

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
      metricsResponse: null
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

  render () {
    const {selectedNavTab, isTableLoading, runsResponse, metricsResponse} = this.state;
    const {width, height, runId} = this.props;
    const experimentName = runsResponse !== null && 'experiment' in runsResponse ? runsResponse.experiment.name : '';
    // Adjust the width of scrollbar from total width
    const style = {
      height: height,
      width: width - 17,
    };
    const localStorageKey = `MetricsPlotView|${runId}`;
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
            content = <div id={DRILLDOWN_VIEW.METRICS}><MetricsPlotView metricsResponse={metricsResponse} runId={runId} localStorageKey={localStorageKey}/></div>;
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
