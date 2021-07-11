import React from 'react';
import mockAxios from 'jest-mock-axios';
import {DrillDownRunModal} from './drillDownRunModal';

describe('DrillDownRunModal', () => {
  let wrapper = null;
  const runId = 2;
  const handleCloseMock = jest.fn();
  const status = 'COMPLETED';
  const dbInfo = {key: 'default', name: 'test_db'};
  console.error = jest.fn();

  beforeEach(() => {
    wrapper = shallow(
      <DrillDownRunModal shouldShow runId={runId} handleClose={handleCloseMock} dbInfo={dbInfo} status={status} localStorageKey='default|view|2'/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    wrapper = null;
  });

  it('should render correctly', async () => {
    expect(wrapper).toMatchSnapshot();
  });
});
