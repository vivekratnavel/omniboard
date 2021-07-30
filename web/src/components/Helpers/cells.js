import PropTypes from 'prop-types';
import React, {Component} from 'reactn';
import {Cell} from 'fixed-data-table-2';
import CreatableSelect from 'react-select/lib/Creatable';
import {Glyphicon} from 'react-bootstrap';
import './cells.scss';

import prettyMs from 'pretty-ms';
import moment from 'moment-timezone';
import EditableTextArea from '../XEditable/editableTextArea';
import * as appConstants from '../../appConstants/app.constants';

const SortTypes = {
  ASC: 'ASC',
  DESC: 'DESC'
};

function reverseSortDirection(sortDir) {
  return sortDir === SortTypes.DESC ? SortTypes.ASC : SortTypes.DESC;
}

class PendingCell extends React.PureComponent {
  static propTypes = {
    columnKey: PropTypes.string,
    children: PropTypes.node,
    rowIndex: PropTypes.number,
    data: PropTypes.object,
    dataVersion: PropTypes.number
  };

  render() {
    const {data, rowIndex, dataVersion, children, ...props} = this.props;
    const rowObject = data && data.getObjectAt(rowIndex);
    return (
      rowObject ?
        <span data-version={dataVersion}>{React.cloneElement(children, {data, rowIndex, dataversion: dataVersion, ...props})}</span> :
        <Cell>pending</Cell>
    );
  }
}

class ExpandRowCell extends React.PureComponent {
  static propTypes = {
    callback: PropTypes.func,
    children: PropTypes.node,
    rowIndex: PropTypes.number
  };

  render() {
    const {callback, rowIndex, children, ...props} = this.props;
    return (
      <Cell onClick={() => callback(rowIndex)}>
        {React.cloneElement(children, {...props, rowIndex})}
      </Cell>
    );
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
    /* eslint-disable no-unused-vars */
    const {data, rowIndex, expandedRows, columnKey, callback, ...props} = this.props;
    /* eslint-enable no-unused-vars */
    return (
      <Cell {...props} onClick={() => callback(rowIndex)}>
        <a test-attr={'cell-' + columnKey + '-' + rowIndex} className='pointer'>
          {expandedRows.has(rowIndex) ? '\u25BC' : '\u25BA'}
        </a>
      </Cell>
    );
  }
}

class SelectionCell extends React.Component {
  static propTypes = {
    callback: PropTypes.func.isRequired,
    columnKey: PropTypes.string,
    data: PropTypes.object,
    selectedRows: PropTypes.object.isRequired,
    rowIndex: PropTypes.number
  };

  render() {
    /* eslint-disable no-unused-vars */
    const {data, rowIndex, selectedRows, columnKey, callback, ...props} = this.props;
    /* eslint-enable no-unused-vars */
    const checked = selectedRows.has(rowIndex);
    return (
      <Cell {...props} onClick={e => {
        e.preventDefault();
        callback(rowIndex);
      }}
      >
        <a test-attr={'cell-' + columnKey + '-' + rowIndex} className='selection-cell-wrapper pointer'>
          <div className='checkbox'>
            <label>
              <input readOnly type='checkbox' value='' checked={checked}/>
              <span className='cr'><i className='cr-icon glyphicon glyphicon-ok'/></span>
            </label>
          </div>
        </a>
      </Cell>
    );
  }
}

class SelectionHeaderCell extends React.PureComponent {
  static propTypes = {
    callback: PropTypes.func.isRequired,
    columnKey: PropTypes.string,
    data: PropTypes.object,
    checked: PropTypes.bool.isRequired,
    indeterminate: PropTypes.bool.isRequired
  };

  render() {
    /* eslint-disable no-unused-vars */
    const {data, columnKey, callback, checked, indeterminate, ...props} = this.props;
    /* eslint-enable no-unused-vars */
    return (
      <Cell {...props} onClick={e => {
        e.preventDefault();
        callback(!checked);
      }}
      >
        <a test-attr={'header-' + columnKey} className='selection-cell-wrapper pointer'>
          <div className='checkbox'>
            <label>
              <input ref={el => el && (el.indeterminate = indeterminate)} readOnly type='checkbox'
                value=''
                checked={checked}/>
              <span className='cr'>
                <i className='cr-icon glyphicon glyphicon-ok'/>
                <i className='cr-indeterminate-icon glyphicon glyphicon-minus'/>
              </span>
            </label>
          </div>
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
    const value = columnKey === 'duration' && dataValue ? prettyMs(dataValue) :
      // eslint-disable-next-line no-negated-condition
      (typeof dataValue) !== 'string' ? JSON.stringify(dataValue) : dataValue;
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
    if (this.global.settings && this.global.settings[appConstants.SETTING_TIMEZONE] && dateValue) {
      const userTimezone = this.global.settings[appConstants.SETTING_TIMEZONE].value;
      dateValue = moment.tz(moment.tz(dateValue, appConstants.SERVER_TIMEZONE), userTimezone).format('YYYY-MM-DDTHH:mm:ss');
    }

    return (
      <Cell test-attr='date-cell' {...props}>
        {dateValue}
      </Cell>
    );
  }
}

class IdCell extends Component {
  static propTypes = {
    columnKey: PropTypes.string,
    data: PropTypes.object,
    rowIndex: PropTypes.number,
    handleDelete: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      showDeleteIcon: false
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

  render() {
    const {data, rowIndex, columnKey, handleDelete, ...props} = this.props;
    const {showDeleteIcon} = this.state;
    const experimentId = data.getObjectAt(rowIndex)[columnKey];
    const deleteHandler = e => {
      e.stopPropagation();
      handleDelete([experimentId])();
    };

    const deleteIcon = showDeleteIcon ? <Glyphicon glyph='trash' className='delete-icon' onClick={deleteHandler}/> : null;
    return (
      <div>
        <Cell {...props} onMouseEnter={this._mouseEnterHandler} onMouseLeave={this._mouseLeaveHandler}>
          {experimentId}
        &nbsp;
          {deleteIcon}
        </Cell>
      </div>
    );
  }
}

class EditableCell extends React.PureComponent {
  static propTypes = {
    changeHandler: PropTypes.func,
    columnKey: PropTypes.string,
    data: PropTypes.object,
    dataVersion: PropTypes.number,
    rowIndex: PropTypes.number
  };

  _handleClick = e => {
    e.stopPropagation();
  };

  render() {
    const {data, rowIndex, dataVersion, columnKey, changeHandler, ...props} = this.props;
    const defaultText = <span className='empty-notes'>Enter Notes <Glyphicon glyph='pencil'/></span>;
    const value = data.getObjectAt(rowIndex)[columnKey];
    return (
      <Cell {...props}>
        <div className='editable-cell right-padding' onClick={this._handleClick}>
          <EditableTextArea
            dataVersion={dataVersion}
            name={'notes' + rowIndex}
            defaultText={defaultText}
            value={value}
            onUpdate={changeHandler(rowIndex)}
          />
        </div>
      </Cell>
    );
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
      const {status} = data.getObjectAt(rowIndex);
      const statusClassName = status && status.toLowerCase();
      const classNames = 'circle pull-left ' + statusClassName;
      return (
        <Cell {...props}>
          <div className='clearfix'>
            <div className={classNames}/>
            <div className='status-text pull-left'>{experimentName}</div>
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

  _handleClick = e => {
    e.stopPropagation();
  };

  render() {
    /* eslint-disable no-unused-vars */
    const {data, rowIndex, columnKey, tagChangeHandler, options, isLoading, tableDom, ...props} = this.props;
    /* eslint-enable no-unused-vars */
    let selectOptions = [];
    let value = [];
    const isLoadingValue = rowIndex in isLoading ? isLoading[rowIndex] : false;
    const formatLabel = label => `Create tag '${label}'`;
    if (options && options.length > 0) {
      selectOptions = options.map(option => {
        return {
          label: option,
          value: option
        };
      });
    }

    if (data) {
      // Get the value for the given column to set value of select input
      const options = data.getObjectAt(rowIndex)[columnKey];
      if (options && options.length > 0) {
        value = options.map(option => {
          return {
            label: option,
            value: option
          };
        });
      }
    }

    return (
      <Cell {...props}>
        <div className='select-cell right-padding' onClick={this._handleClick}>
          <CreatableSelect
            isMulti
            options={selectOptions}
            value={value}
            menuPortalTarget={document.body}
            isLoading={isLoadingValue}
            placeholder='Add Tags...'
            formatCreateLabel={formatLabel}
            onChange={tagChangeHandler(rowIndex)}
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
    };
  }

  _onMouseEnter = () => {
    this.setState({isHover: true});
  };

  _onMouseLeave = () => {
    this.setState({isHover: false});
  };

  _onSortChange = e => {
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
    /* eslint-disable no-unused-vars */
    const {columnKey, sortDir, callback, children, onSortChangeHandler, ...props} = this.props;
    /* eslint-enable no-unused-vars */
    let closeButton = '';
    if (this.state.isHover) {
      closeButton = (
        <a test-attr={'header-sort-close-' + columnKey} className='pull-right' role='button' onClick={() => callback(columnKey)}>
          <span className='glyphicon glyphicon-remove' aria-hidden='true'/>
        </a>
      );
    }

    return (
      <Cell {...props}
        onMouseOver={this._onMouseEnter}
        onMouseLeave={this._onMouseLeave}
      >
        <a test-attr={'header-sort-' + columnKey} role='button' onClick={this._onSortChange}>
          {children} {sortDir ? (sortDir === SortTypes.DESC ? '↑' : '↓') : ''}
        </a>
        {closeButton}
      </Cell>
    );
  }
}

export {CollapseCell, TextCell, SelectCell, EditableCell, HeaderCell, SortTypes,
  ExpandRowCell, StatusCell, IdCell, DateCell, PendingCell, SelectionCell, SelectionHeaderCell};
