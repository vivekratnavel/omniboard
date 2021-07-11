import React from 'react';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import * as events from 'dom-helpers/events';
import {DRILLDOWN_VIEW} from '../../appConstants/drillDownView.constants';
import {parseServerError} from '../Helpers/utils';
import {STATUS} from '../../appConstants/status.constants';
import {DrillDownView} from './drillDownView';

describe('DrillDownView', () => {
  let wrapper = null;
  const off = jest.spyOn(events, 'off');
  console.error = jest.fn();
  toast.error = jest.fn();

  const dbInfo = {key: 'default', name: 'test_db'};

  const runsResponseData = {
    _id: 200,
    meta: {},
    info: {},
    host: {},
    experiment: {
      sources: [
        ['hello_world.py', 'SGVsbG8gV29ybGQh']
      ]
    },
    artifacts: [],
    captured_out: 'captured out',
    status: STATUS.COMPLETED
  };

  const runsResponseDataForFailed = {
    _id: 200,
    meta: {},
    info: {},
    host: {},
    experiment: {
      sources: [
        ['hello_world.py', 'SGVsbG8gV29ybGQh']
      ]
    },
    artifacts: [],
    captured_out: 'captured out',
    status: STATUS.FAILED,
    fail_trace: ['Traceback (most recent call last):\n', '  File "/Users/anaconda3/lib/python3.5/site-packages/sacred/config/captured_function.py", line 46, in captured_function\n    result = wrapped(*args, **kwargs)\n', '  File "hello.py", line 55, in my_main\n    svg2png(bytestring=dwg.tostring(), write_to=\'output.png\')\n']
  };

  const metricsResponseData = [
    {_id: '5a2b5a8c9c7a505a652f6127', name: 'pretrain.train.loss', run_id: 222, steps: [0, 1, 2, 3, 4],
      values: [0.7159541824544438, 0.3840367944955761, 0.3469185283233073, 0.30483262065173106, 0.28915774130337507],
      timestamps: ['2017-12-09T03:37:44.425Z', '2017-12-09T03:41:54.414Z', '2017-12-09T03:46:01.766Z', '2017-12-09T03:50:07.365Z', '2017-12-09T03:54:12.560Z']},
    {_id: '5a2b5aa09c7a505a652f6146', name: 'pretrain.val.loss', run_id: 223, steps: [0, 1, 2, 3, 4],
      values: [0.32177006650114165, 0.23237958704995795, 0.23340759051386187, 0.21925230575196739, 0.20541178824900605],
      timestamps: ['2017-12-09T03:38:01.945Z', '2017-12-09T03:42:11.673Z', '2017-12-09T03:46:18.843Z', '2017-12-09T03:50:24.377Z', '2017-12-09T03:54:29.752Z']}
  ];

  beforeEach(() => {
    wrapper = mount(
      <DrillDownView showHeader height={500} runId={200} width={600} status={STATUS.COMPLETED} dbInfo={dbInfo}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
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

      expect(wrapper.find('div.tab-content ProgressWrapper#ddv-progress-wrapper').instance().props.children.props.id).toEqual(tabKey);
    };

    [
      DRILLDOWN_VIEW.EXPERIMENT,
      DRILLDOWN_VIEW.CAPTURED_OUT,
      DRILLDOWN_VIEW.HOST_INFO,
      DRILLDOWN_VIEW.META_INFO,
      DRILLDOWN_VIEW.METRICS,
      DRILLDOWN_VIEW.RUN_INFO,
      DRILLDOWN_VIEW.ARTIFACTS,
      DRILLDOWN_VIEW.SOURCE_FILES
    ].forEach(key => switchTabTest(key));
  });

  it('should switch to fail trace tab for failed run', async () => {
    mockAxios.mockResponse({status: 200, data: runsResponseDataForFailed});
    mockAxios.mockResponse({status: 200, data: metricsResponseData});

    await tick();
    wrapper.setState({selectedNavTab: DRILLDOWN_VIEW.FAIL_TRACE});

    expect(wrapper.find('div.tab-content ProgressWrapper#ddv-progress-wrapper').instance().props.children.props.id).toEqual(DRILLDOWN_VIEW.FAIL_TRACE);
  });

  it('should handle errors', async () => {
    const err = {status: 500, message: 'internal server error'};
    mockAxios.mockResponse({status: 200, data: runsResponseData});
    mockAxios.mockError(err);
    await tick();

    expect(toast.error).toHaveBeenCalledWith(parseServerError(err));
  });

  describe('should stop mouse wheel propagation', () => {
    beforeEach(() => {
      wrapper.setState({selectedNavTab: DRILLDOWN_VIEW.EXPERIMENT});
    });

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

      expect(event.stopPropagation).toHaveBeenCalledTimes(0);
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
      <DrillDownView height={500} width={600} runId={0} status={STATUS.COMPLETED} dbInfo={dbInfo}/>
    );

    expect(mockAxios.get).not.toHaveBeenCalled();
    wrapper.unmount();
    wrapper = mount(
      <DrillDownView height={500} runId={1} width={600} status={STATUS.COMPLETED} dbInfo={dbInfo}/>
    );

    expect(mockAxios.get).toHaveBeenCalledTimes(2);
  });
});
