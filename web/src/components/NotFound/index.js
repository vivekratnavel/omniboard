import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './style.scss';

export default class NotFound extends Component {
  static propTypes = {
    className: PropTypes.string,
    staticContext: PropTypes.array
  };

  render() {
    const { className,staticContext, ...props } = this.props;
    return (
      <div className={classnames('NotFound', className)} {...props}>
        <h1>
          404 <small>Not Found :(</small>
        </h1>
      </div>
    );
  }
}
