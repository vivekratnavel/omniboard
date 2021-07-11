import PropTypes from 'prop-types';
import React, {Component} from 'react';
import axios from 'axios';
import ReactJson from 'react-json-view';
import './drillDownView.scss';
import {Nav, NavItem, Glyphicon} from 'react-bootstrap';
import {on, off} from 'dom-helpers/events';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import {toast} from 'react-toastify';
import backend, {setDbInfo} from '../Backend/backend';
import {ProgressWrapper} from '../Helpers/hoc';
import {parseServerError} from '../Helpers/utils';
import {DRILLDOWN_VIEW} from '../../appConstants/drillDownView.constants';
import {MetricsPlotView} from '../MetricsPlotView/metricsPlotView';
import {SourceFilesView} from '../SourceFilesView/sourceFilesView';
import {CapturedOutView} from '../CapturedOutView/capturedOutView';
import {STATUS} from '../../appConstants/status.constants';

class JsonView extends React.PureComponent {
  static propTypes = {
    data: PropTypes.object
  };

  render() {
    const {data} = this.props;
    return (
      <ReactJson src={data} iconStyle='circle' collapsed={1}
        collapseStringsAfterLength={40}
        enableClipboard={false} displayDataTypes={false}/>
    );
  }
}

class DrillDownView extends Component {
  static propTypes = {
    height: PropTypes.number,
    runId: PropTypes.number.isRequired,
    width: PropTypes.number,
    status: PropTypes.string.isRequired,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired,
    handleExpandViewClick: PropTypes.func,
    showHeader: PropTypes.bool
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

  _handleSelectNavPill = selectedKey => {
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

  componentDidMount() {
    const {runId, dbInfo} = this.props;
    setDbInfo(backend, dbInfo);
    if (runId) {
      this.setState({
        isTableLoading: true
      });
      axios.all([
        backend.get(`api/v1/Runs/${runId}`, {
          params: {
            select: 'captured_out,info,meta,host,experiment,artifacts,config,fail_trace,status'
          }
        }),
        backend.get('api/v1/Metrics', {
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

    on(this.scrollableDiv, 'wheel', this._stopWheel);
  }

  componentWillUnmount() {
    off(this.scrollableDiv, 'wheel', this._stopWheel);
  }

  render() {
    const {selectedNavTab, isTableLoading, runsResponse, metricsResponse} = this.state;
    const {width, height, runId, status, dbInfo, handleExpandViewClick, showHeader} = this.props;
    const experimentName = runsResponse !== null && 'experiment' in runsResponse ? runsResponse.experiment.name : '';
    // Adjust the width of scrollbar from total width
    const style = {
      height,
      width: width - 17
    };
    const localStorageKey = `${dbInfo.key}|MetricsPlotView|${runId}`;
    let experimentFiles = [];
    // Convert experiment sources to the same structure as artifacts
    // source is an array with the following structure
    // [ "filename", ObjectId ]
    if (runsResponse !== null && 'experiment' in runsResponse &&
      runsResponse.experiment.sources && runsResponse.experiment.sources.length > 0) {
      experimentFiles = runsResponse.experiment.sources.map(source => {
        return {
          name: source[0],
          file_id: source[1]
        };
      });
    }

    const showFailTrace = runsResponse && runsResponse.status === STATUS.FAILED;
    const failTraceMenuItem = showFailTrace ?
      <NavItem eventKey={DRILLDOWN_VIEW.FAIL_TRACE}>Fail Trace</NavItem> :
      null;
    const failTrace = runsResponse && runsResponse.fail_trace ?
      runsResponse.fail_trace.reduce((accumulator, current) => accumulator + current + '\n', '') :
      '';
    const failTraceDom = <pre>{failTrace}</pre>;

    const getTabContent = key => {
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
            content = <div id={DRILLDOWN_VIEW.CAPTURED_OUT}><CapturedOutView initialOutput={runsResponse.captured_out} initialStatus={status} runId={runId}/></div>;
            break;
          case DRILLDOWN_VIEW.FAIL_TRACE:
            content = <div id={DRILLDOWN_VIEW.FAIL_TRACE}>{failTraceDom}</div>;
            break;
          case DRILLDOWN_VIEW.META_INFO:
            content = <div id={DRILLDOWN_VIEW.META_INFO}><JsonView data={runsResponse.meta}/></div>;
            break;
          case DRILLDOWN_VIEW.METRICS:
            content = <div id={DRILLDOWN_VIEW.METRICS}><MetricsPlotView metricsResponse={metricsResponse} runId={runId} dbInfo={dbInfo} localStorageKey={localStorageKey}/></div>;
            break;
          case DRILLDOWN_VIEW.ARTIFACTS:
            content = (
              <div id={DRILLDOWN_VIEW.ARTIFACTS}>
                <SourceFilesView key={'artifacts-' + runsResponse._id} type='artifacts' dbInfo={dbInfo} runId={runsResponse._id} files={runsResponse.artifacts}/>
              </div>
            );
            break;
          case DRILLDOWN_VIEW.SOURCE_FILES:
            content = (
              <div id={DRILLDOWN_VIEW.SOURCE_FILES}>
                <SourceFilesView key={'files-' + runsResponse._id} type='source_files' dbInfo={dbInfo} runId={runsResponse._id} files={experimentFiles}/>
              </div>
            );
            break;
          case DRILLDOWN_VIEW.CONFIG:
            content = <div id={DRILLDOWN_VIEW.CONFIG}><JsonView data={runsResponse.config}/></div>;
            break;
          default:
        }
      }

      return <ProgressWrapper id='ddv-progress-wrapper' loading={isTableLoading}>{content}</ProgressWrapper>;
    };

    const getHeaderContent = showHeader ? (
      <nav className='navbar navbar-light'>
        <span className='navbar-brand'>
          <a onClick={() => handleExpandViewClick(runId, status)}>
            Details for: <strong>{experimentName}</strong> (Id: {runId}) &nbsp;
            <Glyphicon glyph='resize-full'/>
          </a>
        </span>
      </nav>
    ) : null;

    return (
      <div style={style} className='drilldown-view'>
        {getHeaderContent}
        <div className='sidebar-wrapper'>
          <div className='sidebar-container full-height'>
            <div id='sidebar'>
              <Nav stacked bsStyle='pills' activeKey={selectedNavTab} onSelect={this._handleSelectNavPill}>
                <NavItem eventKey={DRILLDOWN_VIEW.METRICS}>
                  Metrics Plot
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.CAPTURED_OUT}>
                  Captured Out
                </NavItem>
                {failTraceMenuItem}
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
                <NavItem eventKey={DRILLDOWN_VIEW.ARTIFACTS}>
                  Artifacts
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.SOURCE_FILES}>
                  Source Files
                </NavItem>
                <NavItem eventKey={DRILLDOWN_VIEW.CONFIG}>
                  Config
                </NavItem>
              </Nav>
            </div>
          </div>
          <div className='sidebar-content full-height'>
            <div ref={div => (this.scrollableDiv = div || this.scrollableDiv)} className='tab-content'>
              {getTabContent(selectedNavTab)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

reactMixin(DrillDownView.prototype, LocalStorageMixin);
export {DrillDownView};
