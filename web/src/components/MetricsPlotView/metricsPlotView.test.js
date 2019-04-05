import React from 'react';
import { MetricsPlotView } from './metricsPlotView';
import mockAxios from 'jest-mock-axios';
import {X_AXIS_VALUE, SCALE_VALUE, X_AXIS_VALUES, SCALE_VALUES} from '../../appConstants/drillDownView.constants';
import keyCode from 'rc-util/lib/KeyCode';

describe('MetricsPlotView', () => {
  let wrapper = null;

  const metricsResponseData = [
    {"_id":"5a2b5a8c9c7a505a652f6127","name":"pretrain.train.loss","run_id":222, "steps":[0,1,2,3,4],
      "values":[0.7159541824544438,0.3840367944955761,0.3469185283233073,0.30483262065173106,0.28915774130337507],
      "timestamps":["2017-12-09T03:37:44.425Z","2017-12-09T03:41:54.414Z","2017-12-09T03:46:01.766Z","2017-12-09T03:50:07.365Z","2017-12-09T03:54:12.560Z"]},
    {"_id":"5a2b5aa09c7a505a652f6146","name":"pretrain.val.loss","run_id":223, "steps":[0,1,2,3,4],
      "values":[0.32177006650114165,0.23237958704995795,0.23340759051386187,0.21925230575196739,0.20541178824900605],
      "timestamps":["2017-12-09T03:38:01.945Z","2017-12-09T03:42:11.673Z","2017-12-09T03:46:18.843Z","2017-12-09T03:50:24.377Z","2017-12-09T03:54:29.752Z"]}];

  beforeEach(() => {
    wrapper = mount(
      <MetricsPlotView metricsResponse={metricsResponseData} runId={222} localStorageKey={"metricsPlot|222"}/>
    );
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {

    expect(wrapper).toMatchSnapshot();
  });

  it('should render when no metrics data is available', () => {
    wrapper = mount(
      <MetricsPlotView metricsResponse={[]} runId={222} localStorageKey={"metricsPlot|222"}/>
    );

    expect(wrapper.find('#plot-metric-names')).toHaveLength(0);
  });

  it('should set default selection correctly', () => {
    localStorage.getItem.mockImplementationOnce(() => '{"selectedMetricNames": ["pretrain.val.loss", "invalid"], "selectedXAxis": "time", "selectedYAxis": "linear", "plotWidth": 900, "plotHeight": 450}');
    wrapper.instance()._setDefaultSelection();

    expect(wrapper.state().selectedMetricNames).toHaveLength(1);
    expect(wrapper.state().selectedXAxis).toEqual('time');
    expect(wrapper.state().selectedYAxis).toEqual('linear');
    expect(wrapper.state().plotWidth).toEqual(900);
    expect(wrapper.state().plotHeight).toEqual(450);

    localStorage.getItem.mockImplementationOnce(() => '{}');
    wrapper.instance()._setDefaultSelection();

    expect(wrapper.state().selectedMetricNames).toHaveLength(0);
    expect(wrapper.state().selectedXAxis).toEqual(X_AXIS_VALUES[0]);
    expect(wrapper.state().selectedYAxis).toEqual(SCALE_VALUES[0]);
    expect(wrapper.state().plotWidth).toEqual(800);
    expect(wrapper.state().plotHeight).toEqual(400);
    // reset localStorage
    localStorage.clear();
  });

  it('should show alert when no metrics are available', () => {
    wrapper = mount(
      <MetricsPlotView metricsResponse={[]} runId={222} localStorageKey={"metricsPlot|222"}/>
    );

    expect(wrapper.find('.alert')).toHaveLength(1);
  });

  describe('should handle', () => {
    it('metricNamesChange correctly', async () => {

      expect(wrapper.find('[test-attr="plot-metric-name-0"]')).toHaveLength(1);
      wrapper.find('[test-attr="plot-metric-name-0"]').simulate('change', {
        target: {
          value: 'pretrain.train.loss',
          checked: true
        }
      });
      wrapper.find('[test-attr="plot-metric-name-0"]').simulate('change', {
        target: {
          value: 'pretrain.train.loss',
          checked: true
        }
      });

      expect(wrapper.state().selectedMetricNames).toHaveLength(1);

      wrapper.find('[test-attr="plot-metric-name-0"]').simulate('change', {
        target: {
          value: 'pretrain.train.loss',
          checked: false
        }
      });

      expect(wrapper.state().selectedMetricNames).toHaveLength(0);
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
  });
});
