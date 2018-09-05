import React from 'react';
import XEditable from './xEditable';

describe('XEditable', () => {
  let wrapper = null,
    isLoading = false;
  const saveHandler = jest.fn(),
    cancelHandler = jest.fn();

  beforeEach(() => {
    wrapper = shallow(
      <XEditable isLoading={isLoading} save={saveHandler} cancel={cancelHandler}/>
    );
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
    isLoading = true;
    wrapper.setProps({isLoading});

    expect(wrapper.update()).toMatchSnapshot();
  });
});
