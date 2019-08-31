import React from 'reactn';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {parseServerError} from '../Helpers/utils';
import * as appConstants from '../../appConstants/app.constants';
import {generateMockResponse} from '../Helpers/testUtils';
import {SettingsModal} from './settingsModal';

describe('SettingsModal', () => {
  let wrapper = null;
  const closeHandler = jest.fn(() => wrapper.setProps({show: false}));
  const autoRefreshUpdateHandler = jest.fn();
  const initialFetchSizeUpdateHandler = jest.fn();
  toast.success = jest.fn();

  beforeEach(() => {
    wrapper = shallow(
      <SettingsModal show handleClose={closeHandler}
        handleInitialFetchSizeUpdate={initialFetchSizeUpdateHandler}
        handleAutoRefreshUpdate={autoRefreshUpdateHandler}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    React.resetGlobal();
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should disable submit when any setting is empty', () => {
    wrapper.setState({settings: {timezone: {value: ''}}});

    expect(wrapper.instance().isSubmitDisabled).toBeTruthy();
  });

  it('should detect correctly if form is dirty', () => {
    wrapper.setState({settings: {timezone: {value: 'Atlantic'}},
      initialSettings: {timezone: {value: 'Atlantic/Reykjavik'}}});

    expect(wrapper.instance().isSubmitDisabled).toBeFalsy();
    expect(wrapper.instance().isFormDirty).toBeTruthy();
  });

  describe('should handle', () => {
    const newTimezone = 'America/Los_Angeles';
    const newRefreshInterval = '60';
    beforeEach(() => {
      wrapper.setState({
        settings: {
          [appConstants.SETTING_TIMEZONE]: {
            value: appConstants.SERVER_TIMEZONE,
            name: appConstants.SETTING_TIMEZONE,
            id: 1
          },
          [appConstants.AUTO_REFRESH_INTERVAL]: {
            value: appConstants.DEFAULT_AUTO_REFRESH_INTERVAL,
            name: appConstants.AUTO_REFRESH_INTERVAL,
            id: 2
          }
        },
        initialSettings: {
          [appConstants.SETTING_TIMEZONE]: {
            value: appConstants.SERVER_TIMEZONE,
            name: appConstants.SETTING_TIMEZONE,
            id: 1
          },
          [appConstants.AUTO_REFRESH_INTERVAL]: {
            value: appConstants.DEFAULT_AUTO_REFRESH_INTERVAL,
            name: appConstants.AUTO_REFRESH_INTERVAL,
            id: 2
          }
        }
      });
      wrapper.find('[test-attr="timezone-select"]').simulate('change', {value: newTimezone});
      wrapper.find('[test-attr="auto-refresh-interval"]').simulate('change', {target: {value: newRefreshInterval}});
      wrapper.find('[test-attr="apply-btn"]').simulate('click');
    });

    it('setting change', () => {
      expect(wrapper.update().state().settings.timezone.value).toEqual(newTimezone);
      expect(wrapper.update().state().settings[appConstants.AUTO_REFRESH_INTERVAL].value).toEqual(newRefreshInterval);
    });

    it('save success', async () => {
      expect(wrapper.state().isInProgress).toBeTruthy();
      wrapper.instance().setGlobal = jest.fn();
      generateMockResponse(200, 2);

      await tick();

      expect(wrapper.state().isInProgress).toBeFalsy();
      expect(wrapper.instance().setGlobal).toHaveBeenCalledWith({
        settings: {
          auto_refresh_interval: {
            id: 2,
            name: appConstants.AUTO_REFRESH_INTERVAL,
            value: newRefreshInterval
          },
          timezone: {
            id: 1,
            name: appConstants.SETTING_TIMEZONE,
            value: newTimezone
          }
        }
      }, expect.any(Function));

      expect(toast.success).toHaveBeenCalledWith('Settings saved successfully!');
    });

    it('save error', async () => {
      const err = {status: 400, response: {data: {message: 'cannot save'}}};
      mockAxios.mockError(err);

      await tick();

      expect(wrapper.state().error).toEqual(parseServerError(err));
    });

    it('save error - bad format', async () => {
      const err = {status: 400, response: {data: {message: 'cannot save'}}};
      mockAxios.mockResponse(err);
      mockAxios.mockResponse(err);

      await tick();

      expect(wrapper.state().error).toEqual(parseServerError(err));
    });

    it('save error - validation error', async () => {
      generateMockResponse(400, 2);
      wrapper.find('[test-attr="auto-refresh-interval"]').simulate('change', {target: {value: '3'}});
      wrapper.find('[test-attr="apply-btn"]').simulate('click');

      expect(wrapper.state().error).toEqual('Auto Refresh Interval must be a Number >= 5');
    });

    it('save when form is not dirty', async () => {
      generateMockResponse(400, 2);
      wrapper.find('[test-attr="timezone-select"]').simulate('change', {value: 'Atlantic/Reykjavik'});
      wrapper.find('[test-attr="auto-refresh-interval"]')
        .simulate('change', {target: {value: appConstants.DEFAULT_AUTO_REFRESH_INTERVAL}});
      wrapper.find('[test-attr="apply-btn"]').simulate('click');

      expect(wrapper.state().error).toEqual('There are no changes to be applied');
    });
  });

  it('should initialize state when modal dialog is reopened', () => {
    wrapper.setState({
      settings: {
        [appConstants.SETTING_TIMEZONE]: {
          value: appConstants.SERVER_TIMEZONE,
          id: 1
        },
        [appConstants.AUTO_REFRESH_INTERVAL]: {
          value: appConstants.DEFAULT_AUTO_REFRESH_INTERVAL,
          id: 2
        }
      },
      initialSettings: {
        [appConstants.SETTING_TIMEZONE]: {
          value: appConstants.SERVER_TIMEZONE,
          id: 1
        },
        [appConstants.AUTO_REFRESH_INTERVAL]: {
          value: appConstants.DEFAULT_AUTO_REFRESH_INTERVAL,
          id: 2
        }
      }
    });
    wrapper.find('[test-attr="close-btn"]').simulate('click');

    wrapper.setProps({show: true});

    expect(wrapper.update().state().settings).toEqual(undefined);
  });
});
