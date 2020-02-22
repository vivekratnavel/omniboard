import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Modal, ModalHeader, ModalBody, ModalTitle, ModalFooter, Button, Glyphicon, ProgressBar} from 'react-bootstrap';
import './deleteRunsConfirmationModal.scss';

class DeleteRunsConfirmationModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    shouldShow: PropTypes.bool.isRequired,
    runs: PropTypes.arrayOf(PropTypes.number).isRequired,
    isDeleteInProgress: PropTypes.bool.isRequired,
    handleDelete: PropTypes.func.isRequired,
    progressPercent: PropTypes.number
  };

  render() {
    const {shouldShow, handleClose, runs, isDeleteInProgress, handleDelete, progressPercent} = this.props;
    const title = runs.length > 1 ? 'Delete Runs' : 'Delete Run';
    const experimentIds = runs.join(', ');
    const body = runs.length > 1 ? `Are you sure you want to delete these runs with run ids: (${experimentIds}) ?` :
      `Are you sure you want to delete this run with runId: ${experimentIds} ?`;
    const deleteGlyph = isDeleteInProgress ? <i className='glyphicon glyphicon-refresh glyphicon-refresh-animate'/> : <Glyphicon glyph='trash'/>;
    const progressBar = isDeleteInProgress && !isNaN(progressPercent) ?
      <div className='progress-bar-container'><ProgressBar active now={progressPercent}/></div> : '';
    return (
      <Modal show={shouldShow} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {body}
          {progressBar}
        </ModalBody>
        <ModalFooter>
          <Button test-attr='close-btn' onClick={handleClose}>Cancel</Button>
          <Button test-attr='delete-btn' bsStyle='danger' disabled={isDeleteInProgress} onClick={handleDelete}>
            {deleteGlyph} Delete
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export {DeleteRunsConfirmationModal};
