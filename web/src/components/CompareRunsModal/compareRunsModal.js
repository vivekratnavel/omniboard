import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Modal, ModalHeader, ModalBody, ModalTitle, Alert, Nav, NavItem, Well} from 'react-bootstrap';
import './compareRunsModal.scss';
import axios from 'axios';
import Multiselect from 'react-bootstrap-multiselect';
import {ProgressWrapper} from '../Helpers/hoc';
import {parseServerError} from '../Helpers/utils';
import {DRILLDOWN_VIEW} from '../../appConstants/drillDownView.constants';
import {MetricsPlotView} from '../MetricsPlotView/metricsPlotView';
import {CapturedOutCompareView} from '../CapturedOutCompareView/capturedOutCompareView';
import {ConfigCompareView} from '../ConfigCompareView/configCompareView';
import {SourceFilesCompareView} from '../SourceFilesCompareView/sourceFilesCompareView';

class CompareRunsModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    shouldShow: PropTypes.bool.isRequired,
    runs: PropTypes.arrayOf(PropTypes.number).isRequired
  };

  runIdOptionsDomNode = null;

  constructor(props) {
    super(props);
    this.state = {
      isLoadingRuns: false,
      selectedNavTab: DRILLDOWN_VIEW.METRICS,
      metrics: [],
      runIdOptions: []
    };
  }

  _fetchMetrics = () => {
    const {runs} = this.props;
    if (runs.length >= 2) {
      this.setState({
        isLoadingRuns: true,
        error: ''
      });
      const queryString = JSON.stringify({
        run_id: {
          $in: runs
        }
      });
      axios.get('/api/v1/Metrics', {
        params: {
          query: queryString
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

  _populateRunIdOptions = () => {
    const {runs} = this.props;
    const runIdOptions = runs.map(runId => {
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

  componentDidMount() {
    // Load data only when the component is being displayed
    if (this.props.shouldShow === true) {
      this._fetchMetrics();
      this._populateRunIdOptions();
    }
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    // Load data every time this modal is being popped up
    if (prevProps.shouldShow !== this.props.shouldShow && this.props.shouldShow === true) {
      this._fetchMetrics();
      this._populateRunIdOptions();
    }
  }

  _handleSelectNavPill = selectedKey => {
    this.setState({
      selectedNavTab: selectedKey
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

  render() {
    const {shouldShow, handleClose, runs} = this.props;
    const {isLoadingRuns, error, selectedNavTab, metrics, runIdOptions} = this.state;
    const errorAlert = error ? <Alert bsStyle='danger'>{error}</Alert> : '';
    // When there are more than 5 runs selected, then the title should show up as [1, 2, 3, 4, 5, ...]
    const runIds = runs.length <= 5 ? runs.join(', ') : runs.slice(0, 5).join(', ') + ', ...';
    const modalTitle = `Compare ${runs.length} Runs [${runIds}]`;
    const selectedRunIds = this._getSelectedRunIds(runIdOptions);
    const metricsResponseForPlot = metrics.filter(metric => selectedRunIds.includes(metric.run_id));
    const getTabContent = key => {
      let content = '';
      switch (key) {
        case DRILLDOWN_VIEW.CAPTURED_OUT:
          content = <div id={DRILLDOWN_VIEW.CAPTURED_OUT}><CapturedOutCompareView runIds={runs}/></div>;
          break;
        case DRILLDOWN_VIEW.METRICS:
          content = (
            <div id={DRILLDOWN_VIEW.METRICS}>
              <Well bsSize='small' className='run-id-filter-well'>
                <h5>Runs</h5>
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
              </Well>
              <MetricsPlotView metricsResponse={metricsResponseForPlot} runId=''/>
            </div>
          );
          break;
        case DRILLDOWN_VIEW.CONFIG:
          content = (
            <div id={DRILLDOWN_VIEW.CONFIG}>
              <ConfigCompareView runIds={runs}/>
            </div>
          );
          break;
        case DRILLDOWN_VIEW.SOURCE_FILES:
          content = (
            <div id={DRILLDOWN_VIEW.SOURCE_FILES}>
              <SourceFilesCompareView runIds={runs} isSelected={selectedNavTab === DRILLDOWN_VIEW.SOURCE_FILES}/>
            </div>
          );
          break;
        default:
      }

      return <ProgressWrapper id='ddv-progress-wrapper' loading={isLoadingRuns}>{content}</ProgressWrapper>;
    };

    return (
      <Modal dialogClassName='compare-runs-modal' show={shouldShow} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>{modalTitle}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {errorAlert}
          <ProgressWrapper loading={isLoadingRuns}>
            <div className='full-height'>
              <div className='sidebar-wrapper full-height'>
                <div className='sidebar-container full-height'>
                  <div id='sidebar'>
                    <Nav stacked bsStyle='pills' activeKey={selectedNavTab} onSelect={this._handleSelectNavPill}>
                      <NavItem eventKey={DRILLDOWN_VIEW.METRICS}>
                        Metrics Plot
                      </NavItem>
                      <NavItem eventKey={DRILLDOWN_VIEW.CAPTURED_OUT}>
                        Captured Out
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
          </ProgressWrapper>
        </ModalBody>
      </Modal>
    );
  }
}

export {CompareRunsModal};
