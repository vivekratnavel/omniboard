import React from 'react';
import mockAxios from 'jest-mock-axios';
import keyCode from 'rc-util/lib/KeyCode';
import {X_AXIS_VALUE, SCALE_VALUE, X_AXIS_VALUES, SCALE_VALUES} from '../../appConstants/drillDownView.constants';
import {MetricsPlotView} from './metricsPlotView';

describe('MetricsPlotView', () => {
  let wrapper = null;

  const metricsResponseData = [
    {_id: '5a2b5a8c9c7a505a652f6127', name: 'pretrain.train.loss', run_id: 222, steps: [0, 1, 2, 3, 4],
      values: [0.7159541824544438, 0.3840367944955761, 0.3469185283233073, 0.30483262065173106, 0.28915774130337507],
      timestamps: ['2017-12-09T03:37:44.425Z', '2017-12-09T03:41:54.414Z', '2017-12-09T03:46:01.766Z', '2017-12-09T03:50:07.365Z', '2017-12-09T03:54:12.560Z'],
      run: [{_id: 222, experiment: {name: 'hello_config', base_dir: '/Users/Documents/sacred_experiment', dependencies: ['CairoSVG==2.4.1', 'sacred==0.7.5', 'svgwrite==1.3.1'], repositories: [], mainfile: 'hello2.py'}, host: {hostname: 'imac.lan', os: ['Darwin'], python_version: '3.7.7', cpu: 'AMD Ryzen 5', ENV: {}}, config: {message: 'Hello world!', recipient: 'world', seed: 797676031, tags: ['test1', 'test2'], train: {batch_size: 50, epochs: 68, lr: 0.01, settings: {epochs: 43}}}, status: 'COMPLETED', info: {}}]},
    {_id: '5a2b5aa09c7a505a652f6146', name: 'pretrain.val.loss', run_id: 223, steps: [0, 1, 2, 3, 4],
      values: [0.32177006650114165, 0.23237958704995795, 0.23340759051386187, 0.21925230575196739, 0.20541178824900605],
      timestamps: ['2017-12-09T03:38:01.945Z', '2017-12-09T03:42:11.673Z', '2017-12-09T03:46:18.843Z', '2017-12-09T03:50:24.377Z', '2017-12-09T03:54:29.752Z'],
      run: [{_id: 223, experiment: {name: 'hello_config', base_dir: '/Users/Documents/sacred_experiment', dependencies: ['CairoSVG==2.4.1', 'sacred==0.7.5', 'svgwrite==1.3.1'], repositories: [], mainfile: 'hello2.py'}, host: {hostname: 'imac.lan', os: ['Darwin'], python_version: '3.7.7', cpu: 'AMD Ryzen 5', ENV: {}}, config: {message: 'Hello world!', recipient: 'world', seed: 797676031, tags: ['test1', 'test2'], train: {batch_size: 50, epochs: 68, lr: 0.01, settings: {epochs: 43}}}, status: 'COMPLETED', info: {}}]}
  ];
  const metricLabels = ['_id', 'experiment.name'];

  beforeEach(async () => {
    wrapper = mount(
      <MetricsPlotView metricsResponse={metricsResponseData} runId={222} localStorageKey='metricsPlot|222' metricLabels={metricLabels}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should render when no metrics data is available', () => {
    wrapper = mount(
      <MetricsPlotView metricsResponse={[]} runId={222} localStorageKey='metricsPlot|222'/>
    );

    expect(wrapper.find('#plot-metric-names')).toHaveLength(0);
  });

  it('should set default selection correctly', () => {
    localStorage.getItem.mockImplementationOnce(() => '{"metricNameOptions": [{"label": "pretrain.val.loss",' +
      ' "value": "pretrain.val.loss", "selected": true}],' +
      ' "selectedXAxis": "time", "selectedYAxis": "linear", "plotWidth": 900, "plotHeight": 450, "plotModes":' +
      ' ["markers","lines"]}');
    wrapper.instance()._setDefaultSelection();

    let selectedMetrics = wrapper.state().metricNameOptions.filter(option => option.selected === true);
    expect(selectedMetrics).toHaveLength(1);
    expect(wrapper.state().selectedXAxis).toEqual('time');
    expect(wrapper.state().selectedYAxis).toEqual('linear');
    expect(wrapper.state().plotWidth).toEqual(900);
    expect(wrapper.state().plotHeight).toEqual(450);
    expect(wrapper.state().plotModes).toContainEqual('markers');
    expect(wrapper.state().plotModes).toHaveLength(2);

    localStorage.getItem.mockImplementationOnce(() => '{}');
    wrapper.instance()._setDefaultSelection();

    selectedMetrics = wrapper.state().metricNameOptions.filter(option => option.selected === true);
    expect(selectedMetrics).toHaveLength(2);
    expect(wrapper.state().selectedXAxis).toEqual(X_AXIS_VALUES[0]);
    expect(wrapper.state().selectedYAxis).toEqual(SCALE_VALUES[0]);
    expect(wrapper.state().plotWidth).toEqual(800);
    expect(wrapper.state().plotHeight).toEqual(400);
    expect(wrapper.state().plotModes).toContainEqual('dashdot');
    expect(wrapper.state().plotModes).toContainEqual('lines');
    // Reset localStorage
    localStorage.clear();
  });

  it('should show alert when no metrics are available', () => {
    wrapper = mount(
      <MetricsPlotView metricsResponse={[]} runId={222} localStorageKey='metricsPlot|222'/>
    );

    expect(wrapper.find('.alert')).toHaveLength(1);
  });

  describe('should handle', () => {
    it('metricNamesChange correctly', async () => {
      expect(wrapper.instance().metricNameOptionsDomNode.$multiselect.val()).toHaveLength(2);

      wrapper.instance().metricNameOptionsDomNode = {
        $multiselect: {
          val: () => ['pretrain.val.loss']
        }
      };
      wrapper.instance()._handleMetricNamesChange({});

      expect(wrapper.state().metricNameOptions.filter(option => option.selected === true)).toHaveLength(1);
    });

    it('x-axis change correctly', async () => {
      wrapper.find('[test-attr="plot-x-axis-0"]').simulate('change', {target: {value: X_AXIS_VALUE.TIME}});

      expect(wrapper.state().selectedXAxis).toEqual(X_AXIS_VALUE.TIME);
    });

    it('y-axis change correctly', async () => {
      wrapper.find('[test-attr="plot-y-axis-0"]').simulate('change', {target: {value: SCALE_VALUE.LOGARITHMIC}});

      expect(wrapper.state().selectedYAxis).toEqual(SCALE_VALUE.LOGARITHMIC);
    });

    it('plot width change correctly', async () => {
      const sliderWrapper = wrapper.find('[test-attr="plot-width-slider"]');
      const sliderHandleWrapper = sliderWrapper.find('.rc-slider-handle').at(1);
      wrapper.instance().setState({plotWidth: 700});
      sliderWrapper.simulate('focus');
      sliderHandleWrapper.simulate('keyDown', {keyCode: keyCode.UP});

      expect(wrapper.update().state().plotWidth).toEqual(750);
    });

    it('plot height change correctly', async () => {
      const sliderWrapper = wrapper.find('[test-attr="plot-height-slider"]');
      const sliderHandleWrapper = sliderWrapper.find('.rc-slider-handle').at(1);
      wrapper.instance().setState({plotHeight: 300});
      sliderWrapper.simulate('focus');
      sliderHandleWrapper.simulate('keyDown', {keyCode: keyCode.UP});

      expect(wrapper.update().state().plotHeight).toEqual(350);
    });

    it('plot smoothing change correctly', async () => {
      const sliderWrapper = wrapper.find('[test-attr="plot-smoothing-slider"]');
      const sliderHandleWrapper = sliderWrapper.find('.rc-slider-handle').at(1);
      wrapper.instance().setState({smoothing: 0.5});
      sliderWrapper.simulate('focus');
      sliderHandleWrapper.simulate('keyDown', {keyCode: keyCode.UP});

      expect(wrapper.update().state().smoothing).toEqual(0.501);
    });

    it('plot mode change correctly', async () => {
      wrapper.instance()._plotModeChangeHandler(0)({value: 'lines'});

      expect(wrapper.update().state().plotModes).toContainEqual('lines');

      wrapper.instance()._plotModeChangeHandler(1)({value: 'marker'});

      expect(wrapper.update().state().plotModes).toContainEqual('lines');
      expect(wrapper.update().state().plotModes).toContainEqual('marker');
    });
  });
});
