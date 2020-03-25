import React from 'react';
import NotFound from '.';

describe('NotFound', () => {
  it('should render', () => {
    const wrapper = shallow(<NotFound/>);

    expect(wrapper).toMatchSnapshot();
  });
});
