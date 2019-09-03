import React from 'react';
import PropTypes from 'prop-types';

export default class XEditable extends React.Component {
  static defaultProps = {
    isLoading: false
  };

  static propTypes = {
    cancel: PropTypes.func,
    children: PropTypes.node,
    isLoading: PropTypes.bool,
    save: PropTypes.func
  };

  render() {
    const {save, isLoading, cancel, children} = this.props;
    return (
      <span className='editable-container editable-inline'>
        <div>
          {isLoading ?
            (
              <div className='editableform-loading'/>
            ) :
            (
              <form className='form-inline editableform' onSubmit={save}>
                <div className='control-group form-group'>
                  <div>
                    <div className='editable-input' style={{
                      position: 'relative'
                    }}
                    >
                      {children}
                    </div>
                    <div className='editable-buttons'>
                      <button type='submit' className='btn btn-primary btn-sm editable-submit' onClick={save}>
                        <i className='glyphicon glyphicon-ok'/>
                      </button>
                      <button type='button' className='btn btn-default btn-sm editable-cancel' onClick={cancel}>
                        <i className='glyphicon glyphicon-remove'/>
                      </button>
                    </div>
                  </div>
                  <div className='editable-error-block help-block'/>
                </div>
              </form>
            )}
        </div>
      </span>
    );
  }
}
