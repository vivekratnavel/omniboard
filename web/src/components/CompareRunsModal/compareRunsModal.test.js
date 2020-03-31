import React from 'react';
import mockAxios from 'jest-mock-axios';
import {DRILLDOWN_VIEW} from '../../appConstants/drillDownView.constants';
import {CompareRunsModal} from './compareRunsModal';

describe('CompareRunsModal', () => {
  let wrapper = null;
  const runIds = [1, 2, 3, 4];
  const handleCloseMock = jest.fn();
  const dbInfo = {key: 'default', name: 'test_db'};
  console.error = jest.fn();

  beforeEach(() => {
    wrapper = mount(
      <CompareRunsModal shouldShow runs={runIds} handleClose={handleCloseMock} dbInfo={dbInfo}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    wrapper = null;
  });

  it('should switch tabs correctly', () => {
    const switchTabTest = tabKey => {
      wrapper.instance()._handleSelectNavPill(tabKey);
      expect(wrapper.update().find('div.tab-content').childAt(0).prop('id')).toEqual(tabKey);
    };

    [
      DRILLDOWN_VIEW.CAPTURED_OUT,
      DRILLDOWN_VIEW.METRICS,
      DRILLDOWN_VIEW.CONFIG,
      DRILLDOWN_VIEW.SOURCE_FILES
    ].forEach(key => switchTabTest(key));
  });
});
