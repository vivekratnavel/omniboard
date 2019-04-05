import PropTypes from 'prop-types'
import React, {Component} from "reactn";
import { Cell } from 'fixed-data-table-2';
import EditableTextArea from '../XEditable/editableTextArea';
import CreatableSelect from 'react-select/lib/Creatable';
import { Glyphicon } from 'react-bootstrap';
import './cells.scss';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap';
import { parseServerError } from "./utils";
import axios from 'axios';
import { toast } from 'react-toastify';
import ms from 'ms';
import moment from 'moment-timezone';
import * as appConstants from "../../appConstants/app.constants";


const SortTypes = {
  ASC: 'ASC',
  DESC: 'DESC',
};

function reverseSortDirection(sortDir) {
  return sortDir === SortTypes.DESC ? SortTypes.ASC : SortTypes.DESC;
}

class ExpandRowCell extends React.PureComponent {
  static propTypes = {
    callback: PropTypes.func,
    children: PropTypes.node,
    rowIndex: PropTypes.number
  };

  render () {
    const {callback, rowIndex, children, ...props} = this.props;
    return (
      <Cell onClick={() => callback(rowIndex)}>
        {React.cloneElement(children, {...props, rowIndex})}
      </Cell>
    )
  }
}

class CollapseCell extends React.PureComponent {
  static propTypes = {
    callback: PropTypes.func,
    columnKey: PropTypes.string,
    data: PropTypes.object,
    expandedRows: PropTypes.object,
    rowIndex: PropTypes.number
  };

  render() {
    const {data, rowIndex, expandedRows, columnKey, callback, ...props} = this.props;
    return (
      <Cell {...props} onClick={() => callback(rowIndex)}>
        <a test-attr={"cell-" + columnKey + "-" + rowIndex} className="pointer">
          {expandedRows.has(rowIndex) ? '\u25BC' : '\u25BA'}
        </a>
      </Cell>
    );
  }
}

class TextCell extends React.PureComponent {
  static propTypes = {
    columnKey: PropTypes.string,
    data: PropTypes.object,
    rowIndex: PropTypes.number
  };

  render() {
    const {data, rowIndex, columnKey, ...props} = this.props;
    const dataValue = data.getObjectAt(rowIndex)[columnKey];
    const value = columnKey === 'duration' && dataValue ? ms(dataValue) : dataValue;
    return (
      <Cell {...props}>
        {value}
      </Cell>
    );
  }
}

class DateCell extends React.PureComponent {
  static propTypes = {
    columnKey: PropTypes.string,
    data: PropTypes.object,
    rowIndex: PropTypes.number
  };

  render() {
    const {data, rowIndex, columnKey, ...props} = this.props;
    let dateValue = data.getObjectAt(rowIndex)[columnKey];
    if (this.global.settings && this.global.settings[appConstants.SETTING_TIMEZONE]) {
      const userTimezone = this.global.settings[appConstants.SETTING_TIMEZONE].value;
      dateValue = moment.tz(moment.tz(dateValue, appConstants.SERVER_TIMEZONE), userTimezone).format('YYYY-MM-DDTHH:mm:ss');
    }
    return (
      <Cell test-attr="date-cell" {...props}>
        {dateValue}
      </Cell>
    );
  }
}

class IdCell extends Component {
  static propTypes = {
    columnKey: PropTypes.string,
    data: PropTypes.object.isRequired,
    rowIndex: PropTypes.number,
    handleDataUpdate: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      showDeleteIcon: false,
      showModal: false,
      isDeleteInProgress: false
    };
  }

  _mouseEnterHandler = () => {
    this.setState({
      showDeleteIcon: true
    });
  };

  _mouseLeaveHandler = () => {
    this.setState({
      showDeleteIcon: false
    });
  };

  _onDeleteClickHandler = (e) => {
    e.stopPropagation();
    this.setState({
      showModal: true
    });
  };

  _closeModalHandler = (e) => {
    e.stopPropagation();
    this.setState({
      showModal: false
    });
  };

  _deleteHandler = (experimentId) => (e) => {
    e.stopPropagation();
    if (experimentId && !isNaN(experimentId)) {
      this.setState({
        isDeleteInProgress: true
      });
      axios.get('/api/v1/Runs/' + experimentId, {
        params: {
          select: 'artifacts,metrics',
          populate: 'metrics'
        }
      }).then(response => {
        const runsResponse = response.data;
        const deleteApis = [];
        if(runsResponse.metrics && runsResponse.metrics.length) {
          deleteApis.push(
            axios.delete('/api/v1/Metrics/', {
            params: {
              query: JSON.stringify({
                run_id: experimentId
              })
            }
          }));
        }
        if (runsResponse.artifacts && runsResponse.artifacts.length) {
          const chunksQuery = runsResponse.artifacts.map(file => {
            return {files_id: file.file_id}
          });
          const filesQuery = runsResponse.artifacts.map(file => {
            return {_id: file.file_id}
          });
          deleteApis.push(
            axios.delete('/api/v1/Fs.chunks/', {
              params: {
                query: JSON.stringify({
                  $or: chunksQuery
                })
              }
            }));
          deleteApis.push(
            axios.delete('/api/v1/Fs.files/', {
              params: {
                query: JSON.stringify({
                  $or: filesQuery
                })
              }
            }));
        }
        deleteApis.push(
          axios.delete('/api/v1/Runs/' + experimentId)
        );

        axios.all(deleteApis).then(axios.spread((...deleteResponses) => {
          if (deleteResponses.every(response => response.status === 204)) {
            // Call callback function to update rows in the table
            this.props.handleDataUpdate(experimentId);
            toast.success(`Experiment run ${experimentId} was deleted successfully!`);
          } else {
            toast.error('An unknown error occurred!');
          }
          this.setState({
            isDeleteInProgress: false,
            showModal: false
          });
        })).catch(error => {
          toast.error(parseServerError(error));
          this.setState({
            isDeleteInProgress: false
          });
        });
      }).catch(error => {
        toast.error(parseServerError(error));
        this.setState({
          isDeleteInProgress: false
        });
      });
    }
  };

  render() {
    const {data, rowIndex, columnKey, handleDataUpdate, ...props} = this.props;
    const {showDeleteIcon, showModal, isDeleteInProgress} = this.state;
    const deleteIcon = showDeleteIcon ? <Glyphicon glyph="trash" className="delete-icon" onClick={this._onDeleteClickHandler}/> : null;
    const experimentId = data.getObjectAt(rowIndex)[columnKey];
    const deleteGlyph = isDeleteInProgress ? <i className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/> : <Glyphicon glyph="trash" />;
    return (
      <div>
      <Cell {...props} onMouseEnter={this._mouseEnterHandler} onMouseLeave={this._mouseLeaveHandler}>
        {experimentId}
        &nbsp;
        {deleteIcon}
      </Cell>
      <Modal show={showModal} onHide={this._closeModalHandler}>
        <ModalHeader closeButton>
          <ModalTitle>Delete Run</ModalTitle>
        </ModalHeader>
        <ModalBody>
          Are you sure you want to delete this run (id: {experimentId})?
        </ModalBody>
        <ModalFooter>
          <Button test-attr="close-btn" onClick={this._closeModalHandler}>Cancel</Button>
          <Button test-attr="delete-btn" bsStyle="danger" disabled={isDeleteInProgress} onClick={this._deleteHandler(experimentId)}>
            {deleteGlyph} Delete
          </Button>
        </ModalFooter>
      </Modal>
      </div>
    );
  }
}

class EditableCell extends React.PureComponent {
  static propTypes = {
    changeHandler: PropTypes.func,
    columnKey: PropTypes.string,
    data: PropTypes.object,
    rowIndex: PropTypes.number
  };

  _handleClick = (e) => {
    e.stopPropagation();
  };

  render() {
    const {data, rowIndex, columnKey, changeHandler, ...props} = this.props;
    const defaultText = <span className="empty-notes">Enter Notes <Glyphicon glyph="pencil" /></span>;
    const value = data.getObjectAt(rowIndex)[columnKey];
    return (
      <Cell {...props}>
        <div onClick={this._handleClick} className="editable-cell right-padding">
          <EditableTextArea
            name={'notes'+rowIndex}
            onUpdate={changeHandler(rowIndex)}
            defaultText={defaultText}
            value={value}
          />
        </div>
      </Cell>
    )
  }
}

class StatusCell extends React.PureComponent {
  static propTypes = {
    columnKey: PropTypes.string,
    data: PropTypes.object,
    rowIndex: PropTypes.number
  };

  render() {
    const {data, rowIndex, columnKey, ...props} = this.props;
    if (data) {
      // Get the value for the given column to set value of select input
      const experimentName = data.getObjectAt(rowIndex)[columnKey];
      const status = data.getObjectAt(rowIndex)['status'];
      const classNames = 'circle pull-left ' + status.toLowerCase();
      return (
        <Cell {...props}>
          <div className="clearfix">
            <div className={classNames}></div>
            <div className="status-text pull-left">{experimentName}</div>
          </div>
        </Cell>
      );
    }
  }
}

class SelectCell extends React.PureComponent {
  static propTypes = {
    columnKey: PropTypes.string,
    data: PropTypes.object,
    isLoading: PropTypes.object,
    options: PropTypes.array,
    rowIndex: PropTypes.number,
    tableDom: PropTypes.any,
    tagChangeHandler: PropTypes.func
  };

  _handleClick = (e) => {
    e.stopPropagation();
  };

  render() {
    const {data, rowIndex, columnKey, tagChangeHandler, options, isLoading, tableDom, ...props} = this.props;
    let selectOptions = [];
    let value = [];
    const isLoadingValue = rowIndex in isLoading ? isLoading[rowIndex] : false;
    const formatLabel = (label) => `Create tag '${label}'`;
    if (options && options.length) {
      selectOptions = options.map(option => {
        return {
          label: option,
          value: option
        }
      })
    }
    if (data) {
      // Get the value for the given column to set value of select input
      const options = data.getObjectAt(rowIndex)[columnKey];
      if (options && options.length) {
        value = options.map(option => {
          return {
            label: option,
            value: option
          }
        })
      }
    }
    return (
      <Cell {...props}>
        <div onClick={this._handleClick} className="select-cell right-padding">
          <CreatableSelect
            isMulti
            options={selectOptions}
            onChange={tagChangeHandler(rowIndex)}
            value={value}
            menuPortalTarget={document.body}
            isLoading={isLoadingValue}
            placeholder="Add Tags..."
            formatCreateLabel={formatLabel}
          />
        </div>
      </Cell>
    );
  }
}

class HeaderCell extends Component {
  static propTypes = {
    callback: PropTypes.func,
    children: PropTypes.node,
    columnKey: PropTypes.string,
    onSortChangeHandler: PropTypes.func,
    sortDir: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = {
      isHover: false
    }
  }
  _onMouseEnter = () => {
    this.setState({isHover: true});
  };
  _onMouseLeave = () => {
    this.setState({isHover: false});
  };
  _onSortChange = (e) => {
    e.preventDefault();

    if (this.props.onSortChangeHandler) {
      this.props.onSortChangeHandler(
        this.props.columnKey,
        this.props.sortDir ?
          reverseSortDirection(this.props.sortDir) :
          SortTypes.DESC
      );
    }
  };
  render() {
    const {columnKey, sortDir, callback, children, onSortChangeHandler, ...props} = this.props;
    let closeButton = '';
    if (this.state.isHover) {
      closeButton = <a test-attr={"header-sort-close-" + columnKey} className="pull-right" role="button" onClick={() => callback(columnKey)}>
        <span className="glyphicon glyphicon-remove" aria-hidden="true"/>
      </a>;
    }
    return (
      <Cell {...props}
            onMouseOver={this._onMouseEnter}
            onMouseLeave={this._onMouseLeave}>
        <a test-attr={"header-sort-" + columnKey} onClick={this._onSortChange} role="button">
          {children} {sortDir ? (sortDir === SortTypes.DESC ? '↑' : '↓') : ''}
        </a>
        {closeButton}
      </Cell>
    );
  }
}

export {CollapseCell, TextCell, SelectCell, EditableCell, HeaderCell, SortTypes, ExpandRowCell, StatusCell, IdCell, DateCell}
