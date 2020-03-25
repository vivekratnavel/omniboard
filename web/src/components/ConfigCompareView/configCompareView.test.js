import React from 'react';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {ConfigCompareView} from './configCompareView';

describe('ConfigCompareView', () => {
  let wrapper = null;
  const responseData = [
    {_id: 1, config: {test1: 'test_value', test2: 'test_value_2'}},
    {_id: 2, config: {test1: 'new_value', test3: 'test_value_3'}}
  ];
  const runIds = [1, 2, 3, 4];
  toast.error = jest.fn();

  beforeEach(() => {
    wrapper = mount(
      <ConfigCompareView runIds={runIds}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  describe('should load data', () => {
    it('success', () => {
      expect(mockAxios.get.mock.calls).toHaveLength(1);

      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs', {params: {select: '_id,config', query: JSON.stringify({_id: {$in: [1, 2]}})}}]);
      expect(wrapper.instance().state.runId1).toEqual('1');
      expect(wrapper.instance().state.runId2).toEqual('2');
      mockAxios.mockResponse({status: 200, data: responseData});

      expect(wrapper.instance().state.config1).toEqual(responseData[0].config);
      expect(wrapper.instance().state.config2).toEqual(responseData[1].config);
      expect(wrapper.update()).toMatchSnapshot();
    });

    it('error', () => {
      const errResponse = {status: 400, message: 'Not Found'};
      mockAxios.mockError(errResponse);

      expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
    });
  });

  it('should not load data when runIds < 2', async () => {
    wrapper.unmount();
    mockAxios.reset();
    wrapper = mount(
      <ConfigCompareView runIds={[1]}/>
    );
    expect(wrapper.instance().state.runId1).toEqual('');
    expect(mockAxios.get.mock.calls).toHaveLength(0);
  });

  it('should handle run id change', async () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.reset();
    wrapper.instance()._handleRunIdChange('runId1')({value: '3'});

    expect(wrapper.instance().state.runId1).toEqual('3');
    expect(mockAxios.get.mock.calls).toHaveLength(1);
    expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs', {params: {select: '_id,config', query: JSON.stringify({_id: {$in: [3, 2]}})}}]);
    mockAxios.mockResponse({status: 200, data: []});
  });

  describe('componentDidUpdate', () => {
    beforeEach(() => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.reset();
    });

    it('loads data', async () => {
      wrapper.setProps({runIds: [1, 4, 2, 3]});

      expect(wrapper.instance().state.runId2).toEqual('4');
      expect(mockAxios.get.mock.calls).toHaveLength(1);
      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs', {params: {select: '_id,config', query: JSON.stringify({_id: {$in: [1, 4]}})}}]);
      mockAxios.mockResponse({status: 200, data: []});
    });

    it('does not load data', async () => {
      wrapper.setProps({runIds: [1, 2, 3, 4]});

      expect(mockAxios.get.mock.calls).toHaveLength(0);
    });
  });
});
