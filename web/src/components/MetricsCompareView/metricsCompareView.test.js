import React from 'react';
import mockAxios from 'jest-mock-axios';
import {MetricsCompareView} from './metricsCompareView';

describe('MetricsCompareView', () => {
  let wrapper = null;
  const responseData = [
    {_id: '5a2b5a8c9c7a505a652f6127', name: 'pretrain.train.loss', run_id: 1, steps: [0, 1, 2, 3, 4],
      values: [0.7159541824544438, 0.3840367944955761, 0.3469185283233073, 0.30483262065173106, 0.28915774130337507],
      timestamps: ['2017-12-09T03:37:44.425Z', '2017-12-09T03:41:54.414Z', '2017-12-09T03:46:01.766Z', '2017-12-09T03:50:07.365Z', '2017-12-09T03:54:12.560Z'],
      run: [{_id: 1, experiment: {name: 'hello_config', base_dir: '/Users/Documents/sacred_experiment', dependencies: ['CairoSVG==2.4.1', 'sacred==0.7.5', 'svgwrite==1.3.1'], repositories: [], mainfile: 'hello2.py'}, host: {hostname: 'imac.lan', os: ['Darwin'], python_version: '3.7.7', cpu: 'AMD Ryzen 5', ENV: {}}, config: {message: 'Hello world!', recipient: 'world', seed: 797676031, tags: ['test1', 'test2'], train: {batch_size: 50, epochs: 68, lr: 0.01, settings: {epochs: 43}}}, status: 'COMPLETED', info: {}}]},
    {_id: '5a2b5aa09c7a505a652f6146', name: 'pretrain.val.loss', run_id: 2, steps: [0, 1, 2, 3, 4],
      values: [0.32177006650114165, 0.23237958704995795, 0.23340759051386187, 0.21925230575196739, 0.20541178824900605],
      timestamps: ['2017-12-09T03:38:01.945Z', '2017-12-09T03:42:11.673Z', '2017-12-09T03:46:18.843Z', '2017-12-09T03:50:24.377Z', '2017-12-09T03:54:29.752Z'],
      run: [{_id: 2, experiment: {name: 'hello_config', base_dir: '/Users/Documents/sacred_experiment', dependencies: ['CairoSVG==2.4.1', 'sacred==0.7.5', 'svgwrite==1.3.1'], repositories: [], mainfile: 'hello2.py'}, host: {hostname: 'imac.lan', os: ['Darwin'], python_version: '3.7.7', cpu: 'AMD Ryzen 5', ENV: {}}, config: {message: 'Hello world!', recipient: 'world', seed: 797676031, tags: ['test1', 'test2'], train: {batch_size: 50, epochs: 68, lr: 0.01, settings: {epochs: 43}}}, status: 'COMPLETED', info: {}}]},
    {_id: '5a2b5a8c9c7a505a652f6127', name: 'pretrain.train.loss', run_id: 3, steps: [0, 1, 2, 3, 4],
      values: [0.7859541824544438, 0.5640367944955761, 0.8769185283233073, 0.60483262065173106, 0.58915774130337507],
      timestamps: ['2017-12-09T03:37:44.425Z', '2017-12-09T03:41:54.414Z', '2017-12-09T03:46:01.766Z', '2017-12-09T03:50:07.365Z', '2017-12-09T03:54:12.560Z'],
      run: [{_id: 3, experiment: {name: 'hello_config', base_dir: '/Users/Documents/sacred_experiment', dependencies: ['CairoSVG==2.4.1', 'sacred==0.7.5', 'svgwrite==1.3.1'], repositories: [], mainfile: 'hello2.py'}, host: {hostname: 'imac.lan', os: ['Darwin'], python_version: '3.7.7', cpu: 'AMD Ryzen 5', ENV: {}}, config: {message: 'Hello world!', recipient: 'world', seed: 797676031, tags: ['test1', 'test2'], train: {batch_size: 50, epochs: 68, lr: 0.01, settings: {epochs: 43}}}, status: 'COMPLETED', info: {}}]},
    {_id: '5a2b5aa09c7a505a652f6146', name: 'pretrain.val.loss', run_id: 4, steps: [0, 1, 2, 3, 4],
      values: [0.52177006650114165, 0.9237958704995795, 0.11340759051386187, 0.41925230575196739, 0.90541178824900605],
      timestamps: ['2017-12-09T03:38:01.945Z', '2017-12-09T03:42:11.673Z', '2017-12-09T03:46:18.843Z', '2017-12-09T03:50:24.377Z', '2017-12-09T03:54:29.752Z'],
      run: [{_id: 4, experiment: {name: 'hello_config', base_dir: '/Users/Documents/sacred_experiment', dependencies: ['CairoSVG==2.4.1', 'sacred==0.7.5', 'svgwrite==1.3.1'], repositories: [], mainfile: 'hello2.py'}, host: {hostname: 'imac.lan', os: ['Darwin'], python_version: '3.7.7', cpu: 'AMD Ryzen 5', ENV: {}}, config: {message: 'Hello world!', recipient: 'world', seed: 797676031, tags: ['test1', 'test2'], train: {batch_size: 50, epochs: 68, lr: 0.01, settings: {epochs: 43}}}, status: 'COMPLETED', info: {}}]}
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

      expect(mockAxios.get.mock.calls[0][0]).toEqual('api/v1/Metrics');
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
    expect(wrapper.instance().state.metricLabels[0]).toEqual('_id');
    wrapper.instance()._handleMetricLabelChange(0)({value: 'experiment.name'});

    expect(wrapper.instance().state.metricLabels[0]).toEqual('experiment.name');
  });

  it('should add new metric label', async () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.reset();
    expect(wrapper.instance().state.metricLabels).toHaveLength(1);
    wrapper.update().find('[test-attr="add-label-btn"]').at(0).simulate('click');

    expect(wrapper.instance().state.metricLabels).toHaveLength(2);
    expect(wrapper.instance().state.metricLabels[1]).toEqual('_id');
  });

  it('should delete a metric label', async () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.reset();
    const addButton = wrapper.update().find('[test-attr="add-label-btn"]').at(0);
    addButton.simulate('click');
    addButton.simulate('click');

    expect(wrapper.instance().state.metricLabels).toHaveLength(3);
    expect(wrapper.instance().state.metricLabels[2]).toEqual('_id');

    wrapper.instance()._handleMetricLabelChange(1)({value: 'experiment.name'});
    wrapper.instance()._handleMetricLabelChange(2)({value: 'host.hostname'});

    wrapper.update().find('[test-attr="delete-label-btn-1"]').at(0).simulate('click');
    expect(wrapper.instance().state.metricLabels).toHaveLength(2);
    expect(wrapper.instance().state.metricLabels[1]).toEqual('host.hostname');

    wrapper.update().find('[test-attr="delete-label-btn-1"]').at(0).simulate('click');
    expect(wrapper.instance().state.metricLabels).toHaveLength(1);
    expect(wrapper.instance().state.metricLabels[0]).toEqual('_id');
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
