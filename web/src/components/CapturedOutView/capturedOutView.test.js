import React from 'reactn';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {STATUS} from '../../appConstants/status.constants';
import {CapturedOutView, MAX_ERROR_COUNT} from './capturedOutView';

describe('CapturedOutView', () => {
  let wrapper = null;
  const responseData = {_id: 16, captured_out: 'INFO - hello_config\nProgress: 0/100\nProgress: 1/100\n', heartbeat: '2019-01-07T02:09:09.057Z', status: 'RUNNING'};
  const constantDate = new Date('2019-01-01 00:00:00 GMT+0000');
  toast.error = jest.fn();
  /* eslint no-global-assign:off */
  Date = class extends Date {
    constructor() {
      super();
      return constantDate;
    }
  };
  jest.useFakeTimers();

  beforeEach(() => {
    React.resetGlobal();
    wrapper = mount(
      <CapturedOutView initialStatus={STATUS.RUNNING} runId={16} initialOutput='Test output'/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should not load data for status other than RUNNING', () => {
    mockAxios.reset();
    wrapper = mount(
      <CapturedOutView initialOutput='Test' initialStatus={STATUS.COMPLETED} runId={1}/>
    );

    expect(mockAxios.get.mock.calls).toHaveLength(0);
  });

  describe('should load data', () => {
    it('success', () => {
      expect(mockAxios.get.mock.calls).toHaveLength(0);
      jest.runAllTimers();

      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/Runs/16', {params: {select: 'captured_out,status,heartbeat'}}]);
      mockAxios.mockResponse({status: 200, data: responseData});

      expect(wrapper.update()).toMatchSnapshot();
    });

    it('error', () => {
      jest.runAllTimers();
      const errResponse = {status: 400, message: 'Not Found'};
      mockAxios.mockError(errResponse);

      expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
    });
  });

  it('should stop polling after max error count', () => {
    wrapper.setState({
      errorCount: MAX_ERROR_COUNT
    });
    jest.runAllTimers();
    const errResponse = {status: 404, message: 'Not Found'};
    mockAxios.mockError(errResponse);

    expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
    expect(toast.error).toHaveBeenCalledWith('Stopping Live Reload on run id: 16 due to too many errors. Please try again later!');
  });
});
