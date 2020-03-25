import React from 'react';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {CapturedOutCompareView} from './capturedOutCompareView';

describe('CapturedOutCompareView', () => {
  let wrapper = null;
  const responseData = [
    {_id: 1, captured_out: 'INFO - hello_config\nProgress: 0/100\nProgress: 1/100\n', heartbeat: '2019-01-07T02:09:09.057Z', status: 'COMPLETED'},
    {_id: 2, captured_out: 'INFO - hello_config2\nProgress: 0/100\nProgress: 1/100\n', heartbeat: '2019-01-07T02:14:45.089Z', status: 'RUNNING'}
  ];
  const runIds = [1, 2, 3, 4];
  toast.error = jest.fn();

  beforeEach(() => {
    wrapper = mount(
      <CapturedOutCompareView runIds={runIds}/>
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

      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs', {params: {select: '_id,captured_out', query: JSON.stringify({_id: {$in: [1, 2]}})}}]);
      expect(wrapper.instance().state.runId1).toEqual('1');
      expect(wrapper.instance().state.runId2).toEqual('2');
      mockAxios.mockResponse({status: 200, data: responseData});

      expect(wrapper.instance().state.capturedOut1).toEqual(responseData[0].captured_out);
      expect(wrapper.instance().state.capturedOut2).toEqual(responseData[1].captured_out);
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
      <CapturedOutCompareView runIds={[1]}/>
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
    expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs', {params: {select: '_id,captured_out', query: JSON.stringify({_id: {$in: [3, 2]}})}}]);
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
      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs', {params: {select: '_id,captured_out', query: JSON.stringify({_id: {$in: [1, 4]}})}}]);
      mockAxios.mockResponse({status: 200, data: []});
    });

    it('does not load data', async () => {
      wrapper.setProps({runIds: [1, 2, 3, 4]});

      expect(mockAxios.get.mock.calls).toHaveLength(0);
    });
  });
});
