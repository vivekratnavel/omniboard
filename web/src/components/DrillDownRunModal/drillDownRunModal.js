import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Modal, ModalHeader, ModalBody, ModalTitle} from 'react-bootstrap';
import './drillDownRunModal.scss';
import {DrillDownView} from '../DrillDownView/drillDownView';

class DrillDownRunModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    shouldShow: PropTypes.bool.isRequired,
    runId: PropTypes.number,
    status: PropTypes.string,
    localStorageKey: PropTypes.string,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired
  };

  render() {
    const {shouldShow, handleClose, runId, dbInfo, status, localStorageKey} = this.props;
    if (runId === null) {
      return (
        <Modal dialogClassName='drilldown-run-modal' show={shouldShow} onHide={handleClose}>
          <ModalHeader closeButton>
            <ModalTitle>Error</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div><strong>Error: Run Id cannot be null.</strong></div>
          </ModalBody>
        </Modal>
      );
    }

    const modalTitle = `Details for Run Id: ${runId}`;
    const drillDownView = (
      <DrillDownView dbInfo={dbInfo}
        runId={runId}
        status={status}
        localStorageKey={localStorageKey}
        width='100%'
        height='100%'
      />
    );

    return (
      <Modal dialogClassName='drilldown-run-modal' show={shouldShow} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>{modalTitle}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {drillDownView}
        </ModalBody>
      </Modal>
    );
  }
}

export {DrillDownRunModal};
