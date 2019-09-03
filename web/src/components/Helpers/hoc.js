import PropTypes from 'prop-types';
import React from 'react';
import './hoc.scss';

export class ProgressWrapper extends React.PureComponent {
  static propTypes = {
    children: PropTypes.node,
    loading: PropTypes.bool
  };

  render() {
    const {loading, children} = this.props;
    let html = children;
    if (loading) {
      html = (
        <div className='table-display'>
          <div className='table-cell-display gray'>
            <i className='glyphicon glyphicon-refresh glyphicon-refresh-animate'/> Loading...
          </div>
        </div>
      );
    }

    return html;
  }
}
