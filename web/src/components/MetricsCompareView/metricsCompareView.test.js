import React from 'react';
import mockAxios from 'jest-mock-axios';
import {MetricsCompareView} from './metricsCompareView';

describe('MetricsCompareView', () => {
  let wrapper = null;
  const responseData = [
    {_id: '5a2b5a8c9c7a505a652f6127', name: 'pretrain.train.loss', run_id: 1, steps: [0, 1, 2, 3, 4],
      values: [0.7159541824544438, 0.3840367944955761, 0.3469185283233073, 0.30483262065173106, 0.28915774130337507],
      timestamps: ['2017-12-09T03:37:44.425Z', '2017-12-09T03:41:54.414Z', '2017-12-09T03:46:01.766Z', '2017-12-09T03:50:07.365Z', '2017-12-09T03:54:12.560Z']},
    {_id: '5a2b5aa09c7a505a652f6146', name: 'pretrain.val.loss', run_id: 2, steps: [0, 1, 2, 3, 4],
      values: [0.32177006650114165, 0.23237958704995795, 0.23340759051386187, 0.21925230575196739, 0.20541178824900605],
      timestamps: ['2017-12-09T03:38:01.945Z', '2017-12-09T03:42:11.673Z', '2017-12-09T03:46:18.843Z', '2017-12-09T03:50:24.377Z', '2017-12-09T03:54:29.752Z']},
    {_id: '5a2b5a8c9c7a505a652f6127', name: 'pretrain.train.loss', run_id: 3, steps: [0, 1, 2, 3, 4],
      values: [0.7859541824544438, 0.5640367944955761, 0.8769185283233073, 0.60483262065173106, 0.58915774130337507],
      timestamps: ['2017-12-09T03:37:44.425Z', '2017-12-09T03:41:54.414Z', '2017-12-09T03:46:01.766Z', '2017-12-09T03:50:07.365Z', '2017-12-09T03:54:12.560Z']},
    {_id: '5a2b5aa09c7a505a652f6146', name: 'pretrain.val.loss', run_id: 4, steps: [0, 1, 2, 3, 4],
      values: [0.52177006650114165, 0.9237958704995795, 0.11340759051386187, 0.41925230575196739, 0.90541178824900605],
      timestamps: ['2017-12-09T03:38:01.945Z', '2017-12-09T03:42:11.673Z', '2017-12-09T03:46:18.843Z', '2017-12-09T03:50:24.377Z', '2017-12-09T03:54:29.752Z']}
  ];
  const runIds = [1, 2, 3, 4];
  console.error = jest.fn();

  beforeEach(() => {
    wrapper = shallow(
      <MetricsCompareView isSelected runIds={runIds}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    wrapper = null;
  });

  describe('should load data', () => {
    it('success', async () => {
      expect(mockAxios.get.mock.calls).toHaveLength(1);

      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Metrics', {params: {query: JSON.stringify({run_id: {$in: [1, 2, 3, 4]}}), populate: 'run'}}]);
      expect(wrapper.instance().state.isLoadingRuns).toBeTruthy();
      mockAxios.mockResponse({status: 200, data: responseData});

      await tick();
      expect(wrapper.update().instance().state.isLoadingRuns).toBeFalsy();
      expect(wrapper.update()).toMatchSnapshot();
    });

    it('error', () => {
      const errResponse = {status: 400, message: 'Not Found'};
      mockAxios.mockError(errResponse);

      expect(wrapper.instance().state.error).not.toEqual('');
    });
  });

  it('should not load data when runIds < 2', async () => {
    wrapper.unmount();
    mockAxios.reset();
    wrapper = mount(
      <MetricsCompareView isSelected runIds={[1]}/>
    );

    expect(mockAxios.get.mock.calls).toHaveLength(0);
    expect(wrapper.instance().state.error).not.toEqual('');
  });

  it('should handle run id change', async () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.reset();
    wrapper.instance().runIdOptionsDomNode = {
      $multiselect: {
        val: () => ['4', '3', '1']
      }
    };
    wrapper.instance()._handleRunIdsChange();

    expect(wrapper.instance().state.runIdOptions.find(option => option.value === 2).selected).toBeFalsy();
  });

  it('should handle metric label change', async () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.reset();
    wrapper.instance()._handleMetricLabelChange({value: 'experiment.name'});

    expect(wrapper.instance().state.metricLabel).toEqual('experiment.name');
  });

  describe('componentDidUpdate', () => {
    beforeEach(() => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.reset();
    });

    it('loads data', async () => {
      wrapper.setProps({runIds: [1, 2]});

      expect(mockAxios.get.mock.calls).toHaveLength(1);
      expect(wrapper.instance().state.isLoadingRuns).toBeTruthy();
    });
  });
});
