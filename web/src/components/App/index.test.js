import React from 'react';
import App from './index';

describe('App component', () => {
  it('should render', () => {
    const wrapper = shallow(<App/>);

    expect(wrapper).toMatchSnapshot();
  });
});