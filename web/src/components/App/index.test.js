import React from 'reactn';
import App from './index';
import mockAxios from 'jest-mock-axios';
import { toast } from "react-toastify";
import {parseServerError} from "../Helpers/utils";
import * as appConstants from "../../appConstants/app.constants";

describe('App component', () => {
  let wrapper = null;
  toast.error = jest.fn();

  beforeEach(async () => {
    wrapper = shallow(<App match={{params: {model: undefined}}}/>);
    await tick();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
    // reset localStorage
    localStorage.clear();
    React.resetGlobal();
  });

  it('should render', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should reset cache', () => {
    // mock location.reload method
    Object.defineProperty(window.location, 'reload', {
      configurable: true,
    });
    window.location.reload = jest.fn();

    const value = 'testValue';
    localStorage.setItem('test', value);

    expect(localStorage.__STORE__['test']).toEqual(value);
    wrapper.find('[test-attr="reset-cache-button"]').simulate('click');

    expect(Object.keys(localStorage.__STORE__)).toHaveLength(0);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('should show/hide ManageConfigColumns modal', () => {
    wrapper.find('[test-attr="manage-config-columns-button"]').simulate('click');

    expect(wrapper.state().showConfigColumnModal).toBeTruthy();
    wrapper.instance()._handleConfigColumnModalClose();

    expect(wrapper.state().showConfigColumnModal).toBeFalsy();
  });

  it('should show/hide Settings modal', () => {
    wrapper.find('[test-attr="settings-button"]').simulate('click');

    expect(wrapper.state().showSettingsModal).toBeTruthy();
    wrapper.instance()._handleSettingsModalClose();

    expect(wrapper.state().showSettingsModal).toBeFalsy();
  });

  describe('should fetch database name on mount', async () => {
    it('and handle success', async () => {
      expect(mockAxios.get).toHaveBeenCalledWith('api/v1/database');
      mockAxios.mockResponse({status: 200, data: {name: 'test_db'}});
      mockAxios.mockResponse({status: 200, data: [{name: 'timezone', value: 'Atlantic/Reykjavik', _id: 1}]});
      await tick();

      expect(wrapper.update().state().dbName).toEqual('test_db');
    });

    it('and handle error', async () => {
      const error = {status: 500, message: 'Unknown error'};
      mockAxios.mockError(error);
      mockAxios.mockError(error);
      await tick();

      expect(toast.error).toHaveBeenCalledWith(parseServerError(error));
    });
  });

  describe('should write default settings for the first time', async () => {
    it('when none of the settings are present', async () => {
      const setting = {name: 'timezone', value: 'Atlantic/Reykjavik', _id: 1};
      const autoRefreshSetting = {name: 'auto_refresh_interval', value: 30, _id: 2};
      mockAxios.mockResponse({status: 200, data: {name: 'test_db'}});
      mockAxios.mockResponse({status: 200, data: []});
      await tick();

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      mockAxios.mockResponse({status: 201, data: setting});
      mockAxios.mockResponse({status: 201, data: autoRefreshSetting});

      await tick();

      expect(wrapper.update().instance().global.settings[appConstants.SETTING_TIMEZONE]).toEqual(setting);
      expect(wrapper.update().instance().global.settings[appConstants.AUTO_REFRESH_INTERVAL]).toEqual(autoRefreshSetting);
    });

    it('when only auto refresh setting is present', async () => {
      const setting = {name: 'timezone', value: 'Atlantic/Reykjavik', _id: 2};
      const autoRefreshSetting = {
          name: appConstants.AUTO_REFRESH_INTERVAL,
          value: 60,
          _id: 1
        };
      mockAxios.mockResponse({status: 200, data: {name: 'test_db'}});
      mockAxios.mockResponse({status: 200, data: [autoRefreshSetting]});
      await tick();

      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      mockAxios.mockResponse({status: 201, data: setting});

      await tick();

      expect(wrapper.update().instance().global.settings[appConstants.SETTING_TIMEZONE]).toEqual(setting);
      expect(wrapper.update().instance().global.settings[appConstants.AUTO_REFRESH_INTERVAL]).toEqual(autoRefreshSetting);
    });
  });
});
