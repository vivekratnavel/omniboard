import React from 'react';
import PropTypes from 'prop-types';
import XEditable from './xEditable';

export default class EditableTextArea extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    name: PropTypes.string,
    className: PropTypes.string,
    value: PropTypes.node,
    rows: PropTypes.number,
    cols: PropTypes.number,
    placeholder: PropTypes.string,
    onUpdate: PropTypes.func.isRequired,
    defaultText: PropTypes.node
  };

  _textAreaDom = null;

  constructor(props) {
    super(props);
    this.state = {
      isEditing: false,
      value: this.props.value,
      defaultText: this.props.defaultText || 'Empty',
    };
    this.setState = this.setState.bind(this);
  }
  componentWillReceiveProps(props, context) {
    this.setState({value: props.value});
  }
  save = (event) => {
    event.preventDefault();
    this.props.onUpdate(this.props.name, this._textAreaDom.value);
    this.setState({isEditing: false, value: this._textAreaDom.value});
  };
  cancel = (e) => {
    this.setState({isEditing: false});
  };
  handleLinkClick = (e) => {
    this.setState({isEditing: true});
  };
  render() {
    if (this.state.isEditing) {
      const textareaClassName = `form-control ${this.props.className}`;
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
    } else {
      let aClassName = 'editable editable-click';
      let content = <pre>{this.state.value}</pre>;
      if (!this.state.value) {
        aClassName += ' editable-empty';
        content = this.state.defaultText;
      }
      return <a test-attr="edit-button" role="button" className={aClassName} style={this.state.textStyle} onClick={this.handleLinkClick}>
        {content}
      </a>;
    }
  }
}