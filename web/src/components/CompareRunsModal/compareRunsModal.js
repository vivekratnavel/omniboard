import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Modal, ModalHeader, ModalBody, ModalTitle, Nav, NavItem} from 'react-bootstrap';
import './compareRunsModal.scss';
import {DRILLDOWN_VIEW} from '../../appConstants/drillDownView.constants';
import {CapturedOutCompareView} from '../CapturedOutCompareView/capturedOutCompareView';
import {ConfigCompareView} from '../ConfigCompareView/configCompareView';
import {SourceFilesCompareView} from '../SourceFilesCompareView/sourceFilesCompareView';
import {MetricsCompareView} from '../MetricsCompareView/metricsCompareView';

class CompareRunsModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    shouldShow: PropTypes.bool.isRequired,
    runs: PropTypes.arrayOf(PropTypes.number).isRequired,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedNavTab: DRILLDOWN_VIEW.METRICS
    };
  }

  _handleSelectNavPill = selectedKey => {
    this.setState({
      selectedNavTab: selectedKey
    });
  };

  render() {
    const {shouldShow, handleClose, runs, dbInfo} = this.props;
    const {selectedNavTab} = this.state;
    // When there are more than 5 runs selected, then the title should show up as [1, 2, 3, 4, 5, ...]
    const runIds = runs.length <= 5 ? runs.join(', ') : runs.slice(0, 5).join(', ') + ', ...';
    const modalTitle = `Compare ${runs.length} Runs [${runIds}]`;
    const getTabContent = key => {
      let content = '';
      switch (key) {
        case DRILLDOWN_VIEW.CAPTURED_OUT:
          content = <div id={DRILLDOWN_VIEW.CAPTURED_OUT}><CapturedOutCompareView runIds={runs}/></div>;
          break;
        case DRILLDOWN_VIEW.METRICS:
          content = (
            <div id={DRILLDOWN_VIEW.METRICS}>
              <MetricsCompareView runIds={runs} isSelected={selectedNavTab === DRILLDOWN_VIEW.METRICS}/>
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
              <SourceFilesCompareView dbInfo={dbInfo} runIds={runs} isSelected={selectedNavTab === DRILLDOWN_VIEW.SOURCE_FILES}/>
            </div>
          );
          break;
        default:
      }

      return content;
    };

    return (
      <Modal dialogClassName='compare-runs-modal' show={shouldShow} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>{modalTitle}</ModalTitle>
        </ModalHeader>
        <ModalBody>
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
        </ModalBody>
      </Modal>
    );
  }
}

export {CompareRunsModal};
