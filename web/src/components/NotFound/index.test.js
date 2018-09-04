import React from 'react';
import NotFound from './index';

describe('NotFound', () => {
  it('should render', () => {
    const wrapper = shallow(<NotFound/>);
    expect(wrapper).toMatchSnapshot();
  });
});
