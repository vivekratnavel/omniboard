import React from 'react';
import PropTypes from 'prop-types';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';
import XEditable from './xEditable';
import './editableTextArea.scss';

export default class EditableTextArea extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.node,
    rows: PropTypes.number,
    cols: PropTypes.number,
    placeholder: PropTypes.string,
    onUpdate: PropTypes.func.isRequired,
    defaultText: PropTypes.node,
    dataVersion: PropTypes.number
  };

  _textAreaDom = null;

  constructor(props) {
    super(props);
    this.state = {
      isEditing: false,
      value: this.props.value,
      defaultText: this.props.defaultText || 'Empty'
    };
    this.setState = this.setState.bind(this);
  }

  static getDerivedStateFromProps(props, _state) {
    return {value: props.value};
  }

  save = event => {
    event.preventDefault();
    this.props.onUpdate(this.props.name, this._textAreaDom.value);
    this.setState({isEditing: false, value: this._textAreaDom.value});
  };

  cancel = _e => {
    this.setState({isEditing: false});
  };

  handleLinkClick = _e => {
    this.setState({isEditing: true});
  };

  render() {
    if (this.state.isEditing) {
      const textareaClassName = 'form-control editable-text-area';
      return (
        <XEditable isLoading={false} save={this.save} cancel={this.cancel}>
          <textarea ref={node => this._textAreaDom = node} id={this.props.id}
            className={textareaClassName}
            rows={this.props.rows}
            cols={this.props.cols}
            name={this.props.name}
            defaultValue={this.props.value}
            placeholder={this.props.placeholder}/>
        </XEditable>
      );
    }

    let aClassName = 'editable editable-click';
    let content = <pre className='pre-notes'>{this.state.value}</pre>;
    if (!this.state.value) {
      aClassName += ' editable-empty';
      content = this.state.defaultText;
    }

    const tooltipId = `tooltip-${this.props.id}`;
    const tooltip = (
      <Tooltip id={tooltipId}>
        {this.state.value}
      </Tooltip>
    );
    const contentWithTooltip = this.state.value ? (
      <OverlayTrigger placement='right' overlay={tooltip}>
        {content}
      </OverlayTrigger>
    ) : content;
    return (
      <a test-attr='edit-button' data-version={this.props.dataVersion} role='button' className={aClassName} style={this.state.textStyle} onClick={this.handleLinkClick}>
        {contentWithTooltip}
      </a>
    );
  }
}
