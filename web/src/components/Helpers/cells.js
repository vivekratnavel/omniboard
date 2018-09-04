import PropTypes from 'prop-types'
import React, {Component} from "react";
import { Cell } from 'fixed-data-table-2';
import EditableTextArea from '../XEditable/editableTextArea';
import CreatableSelect from 'react-select/lib/Creatable';

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
    return (
      <Cell {...props}>
        {data.getObjectAt(rowIndex)[columnKey]}
      </Cell>
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
    const defaultText = <span className="empty-notes">Enter Notes <span className="glyphicon glyphicon-pencil"/></span>;
    const value = data.getObjectAt(rowIndex)[columnKey];
    return (
      <Cell {...props}>
        <div onClick={this._handleClick} className="right-padding">
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
        <div onClick={this._handleClick} className="right-padding">
          <CreatableSelect
            isMulti
            options={selectOptions}
            onChange={tagChangeHandler(rowIndex)}
            value={value}
            menuPortalTarget={document.body}
            isLoading={isLoadingValue}
            placeholder="Add Tags..."
            formatCreateLabel={(label) => `Create tag '${label}'`}
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

export {CollapseCell, TextCell, SelectCell, EditableCell, HeaderCell, SortTypes, ExpandRowCell, StatusCell}
