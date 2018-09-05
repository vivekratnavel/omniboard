import React from 'react';
import { DrillDownView } from './drillDownView';
import mockAxios from 'jest-mock-axios';
import { DRILLDOWN_VIEW, X_AXIS_VALUE, SCALE_VALUE } from '../../constants/drillDownView.constants';
import { toast } from 'react-toastify';
import { parseServerError } from '../Helpers/utils';
import * as events from 'dom-helpers/events';

describe('DrillDownView', () => {
  let wrapper = null;
  const off = jest.spyOn(events, 'off');
  /* eslint-disable no-console */
  console.error = jest.fn();
  toast.error = jest.fn();

  const runsResponseData = {
    _id: 200,
    meta: {},
    info: {},
    host: {},
    experiment: {},
    captured_out: 'captured out',
  };

  const metricsResponseData = [
    {"_id":"5a2b5a8c9c7a505a652f6127","name":"pretrain.train.loss","run_id":222, "steps":[0,1,2,3,4],
      "values":[0.7159541824544438,0.3840367944955761,0.3469185283233073,0.30483262065173106,0.28915774130337507],
      "timestamps":["2017-12-09T03:37:44.425Z","2017-12-09T03:41:54.414Z","2017-12-09T03:46:01.766Z","2017-12-09T03:50:07.365Z","2017-12-09T03:54:12.560Z"]},
    {"_id":"5a2b5aa09c7a505a652f6146","name":"pretrain.val.loss","run_id":222, "steps":[0,1,2,3,4],
      "values":[0.32177006650114165,0.23237958704995795,0.23340759051386187,0.21925230575196739,0.20541178824900605],
      "timestamps":["2017-12-09T03:38:01.945Z","2017-12-09T03:42:11.673Z","2017-12-09T03:46:18.843Z","2017-12-09T03:50:24.377Z","2017-12-09T03:54:29.752Z"]}];

  beforeEach(() => {
    wrapper = mount(
      <DrillDownView height={500} runId={200} width={600}/>
    );
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.state().isTableLoading).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: runsResponseData});
    mockAxios.mockResponse({status: 200, data: metricsResponseData});
    wrapper.setState({selectedNavTab: DRILLDOWN_VIEW.EXPERIMENT});
    await tick();

    expect(wrapper.state().isTableLoading).toBeFalsy();
  });

  it('should switch tabs correctly', async () => {
    mockAxios.mockResponse({status: 200, data: runsResponseData});
    mockAxios.mockResponse({status: 200, data: metricsResponseData});
    wrapper.find('a').last().simulate('click');

    expect(wrapper.find('li').last().hasClass('active')).toBeTruthy();
    expect(wrapper.find('li.active')).toHaveLength(1);
    await tick();
    const switchTabTest = tabKey => {
      wrapper.setState({selectedNavTab: tabKey});

      expect(wrapper.find('div.tab-content ProgressWrapper').instance().props.children.props.id).toEqual(tabKey);
    };
    [
      DRILLDOWN_VIEW.EXPERIMENT,
      DRILLDOWN_VIEW.CAPTURED_OUT,
      DRILLDOWN_VIEW.HOST_INFO,
      DRILLDOWN_VIEW.META_INFO,
      DRILLDOWN_VIEW.METRICS,
      DRILLDOWN_VIEW.RUN_INFO
    ].forEach(key => switchTabTest(key));
  });

  it('should render metrics plot correctly', async () => {
    mockAxios.mockResponse({status: 200, data: runsResponseData});
    mockAxios.mockResponse({status: 200, data: metricsResponseData});

    expect(shallow(wrapper.instance().getMetricsPlot()).find('.alert')).toHaveLength(1);
    await tick();
    const metricsPlotWrapper = shallow(wrapper.instance().getMetricsPlot());

    expect(metricsPlotWrapper.find('.metrics-plot-content')).toHaveLength(1);
    expect(metricsPlotWrapper.find('#plot-metric-names').children()).toHaveLength(2);
    expect(metricsPlotWrapper.find('#plot-x-axis-types').children()).toHaveLength(2);
    expect(metricsPlotWrapper.find('#plot-y-axis-types').children()).toHaveLength(2);
  });

  describe('should handle', () => {
    let metricsPlotWrapper = null;

    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: runsResponseData});
      mockAxios.mockResponse({status: 200, data: metricsResponseData});
      await tick();
      metricsPlotWrapper = shallow(wrapper.instance().getMetricsPlot());
    });

    it('should handle metricNamesChange correctly', async () => {
      expect(metricsPlotWrapper.find('[test-attr="plot-metric-name-0"]')).toHaveLength(1);
      metricsPlotWrapper.find('[test-attr="plot-metric-name-0"]').simulate('change', {
        target: {
          value: 'pretrain.train.loss',
          checked: true
        }
      });

      expect(wrapper.state().selectedMetricNames.size).toEqual(1);
      metricsPlotWrapper.find('[test-attr="plot-metric-name-0"]').simulate('change', {
        target: {
          value: 'pretrain.train.loss',
          checked: false
        }
      });

      expect(wrapper.state().selectedMetricNames.size).toEqual(0);
    });

    it('should handle x-axis change correctly', async () => {
      metricsPlotWrapper.find('[test-attr="plot-x-axis-0"]').simulate('change', {target: {value: X_AXIS_VALUE.TIME}});

      expect(wrapper.state().selectedXAxis).toEqual(X_AXIS_VALUE.TIME);
    });

    it('should handle y-axis change correctly', async () => {
      metricsPlotWrapper.find('[test-attr="plot-y-axis-0"]').simulate('change', {target: {value: SCALE_VALUE.LOGARITHMIC}});

      expect(wrapper.state().selectedYAxis).toEqual(SCALE_VALUE.LOGARITHMIC);
    });
  });

  it('should handle errors', async () => {
    const err = {status: 500, message: 'internal server error'};
    mockAxios.mockResponse({status: 200, data: runsResponseData});
    mockAxios.mockError(err);
    await tick();

    expect(toast.error).toHaveBeenCalledWith(parseServerError(err));
  });

  describe('should stop mouse wheel propagation', () => {
    it('for horizontal scroll', async () => {
      mockAxios.mockResponse({status: 200, data: runsResponseData});
      mockAxios.mockResponse({status: 200, data: metricsResponseData});
      const event = {deltaX: 5, stopPropagation: jest.fn()};
      wrapper.instance()._stopWheel(event);
      await tick();

      expect(event.stopPropagation).not.toHaveBeenCalled();
      wrapper.setState({selectedNavTab: DRILLDOWN_VIEW.CAPTURED_OUT});
      wrapper.instance()._stopWheel(event);

      expect(event.stopPropagation).toHaveBeenCalledWith();
    });

    it('for vertical scroll', async () => {
      mockAxios.mockResponse({status: 200, data: runsResponseData});
      mockAxios.mockResponse({status: 200, data: metricsResponseData});
      const event = {deltaY: -5, stopPropagation: jest.fn()};
      wrapper.instance()._stopWheel(event);
      await tick();

      expect(event.stopPropagation).not.toHaveBeenCalled();
      wrapper.instance().scrollableDiv = {scrollTop: 5, scrollHeight: 30, clientHeight: 40};
      wrapper.instance()._stopWheel(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      wrapper.instance().scrollableDiv = {scrollTop: 0, scrollHeight: 100, clientHeight: 40};
      event.deltaY = 5;
      wrapper.instance()._stopWheel(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(2);
    });
  });

  it('unregisters event listener on unmount', () => {
    expect(off).not.toHaveBeenCalled();
    wrapper.unmount();

    expect(off).toHaveBeenCalledTimes(1);
  });

  it('should not call API without runId', () => {
    wrapper.unmount();
    mockAxios.reset();
    wrapper = mount(
      <DrillDownView height={500} width={600}/>
    );

    expect(mockAxios.get).not.toHaveBeenCalled();
    wrapper.unmount();
    wrapper = mount(
      <DrillDownView height={500} runId={1} width={600}/>
    );

    expect(mockAxios.get).toHaveBeenCalledTimes(2);
  })
});
