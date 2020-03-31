import React from 'reactn';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {parseServerError} from '../Helpers/utils';
import * as appConstants from '../../appConstants/app.constants';
import App from '.';

describe('App component', () => {
  let wrapper = null;
  toast.error = jest.fn();

  beforeEach(async () => {
    const app = <App match={{params: {dbPath: 'test'}}}/>;
    wrapper = shallow(app);
    wrapper.setState({dbInfo: {key: 'default', name: 'test_db'}});
    await tick();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    React.resetGlobal();
  });

  it('should render', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should reset cache', () => {
    // Mock location.reload method
    // eslint-disable-next-line no-unused-vars
    const {location} = window;
    delete window.location;
    window.location = {reload: jest.fn()};
    const value = 'testValue';
    localStorage.setItem('test', value);

    expect(localStorage.__STORE__.test).toEqual(value);
    wrapper.find('[test-attr="reset-cache-button"]').simulate('click');

    expect(Object.keys(localStorage.__STORE__)).toHaveLength(0);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('should show/hide ManageCustomColumns modal', () => {
    wrapper.find('[test-attr="manage-config-columns-button"]').simulate('click');

    expect(wrapper.state().showCustomColumnModal).toBeTruthy();
    wrapper.instance()._handleCustomColumnModalClose();

    expect(wrapper.state().showCustomColumnModal).toBeFalsy();
  });

  it('should show/hide Settings modal', () => {
    wrapper.find('[test-attr="settings-button"]').simulate('click');

    expect(wrapper.state().showSettingsModal).toBeTruthy();
    wrapper.instance()._handleSettingsModalClose();

    expect(wrapper.state().showSettingsModal).toBeFalsy();
  });

  describe('should fetch database names on mount', () => {
    it('and handle success', async () => {
      expect(mockAxios.get).toHaveBeenCalledWith('api/v1/database');
      mockAxios.mockResponse({status: 200, data: [{key: 'default', path: '/test', name: 'test_db'}]});
      mockAxios.mockResponse({status: 200, data: {key: 'default', name: 'test_db'}});
      mockAxios.mockResponse({status: 200, data: [{name: 'timezone', value: 'Atlantic/Reykjavik', _id: 1}]});
      mockAxios.mockResponse({status: 200, data: {version: '1.0.0'}});
      await tick();

      expect(wrapper.update().state().otherDbs).toEqual([{key: 'default', path: '/test', name: 'test_db'}]);
      expect(wrapper.update().state().dbInfo).toEqual({key: 'default', name: 'test_db'});
      expect(wrapper.update().state().appVersion).toEqual('v1.0.0');
    });

    it('and handle error', async () => {
      const error = {status: 500, message: 'Unknown error'};
      mockAxios.mockError(error);
      mockAxios.mockError(error);
      await tick();

      expect(toast.error).toHaveBeenCalledWith(parseServerError(error));
    });
  });

  describe('should write default settings for the first time', () => {
    it('when none of the settings are present', async () => {
      const setting = {name: 'timezone', value: 'Atlantic/Reykjavik', _id: 1};
      const autoRefreshSetting = {name: 'auto_refresh_interval', value: 30, _id: 2};
      const initialFetchSize = {name: 'initial_fetch_size', value: 50, _id: 3};
      const rowHeight = {name: 'row_height', value: 70, _id: 4};
      mockAxios.mockResponse({status: 200, data: [{key: 'default', path: '/test', name: 'test_db'}]});
      mockAxios.mockResponse({status: 200, data: {key: 'default', name: 'test_db'}});
      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: {version: '1.0.0'}});
      await tick();

      expect(mockAxios.post).toHaveBeenCalledTimes(4);
      mockAxios.mockResponse({status: 201, data: setting});
      mockAxios.mockResponse({status: 201, data: autoRefreshSetting});
      mockAxios.mockResponse({status: 201, data: initialFetchSize});
      mockAxios.mockResponse({status: 201, data: rowHeight});

      await tick();

      expect(wrapper.update().instance().global.settings[appConstants.SETTING_TIMEZONE]).toEqual(setting);
      expect(wrapper.update().instance().global.settings[appConstants.AUTO_REFRESH_INTERVAL]).toEqual(autoRefreshSetting);
      expect(wrapper.update().instance().global.settings[appConstants.INITIAL_FETCH_SIZE]).toEqual(initialFetchSize);
      expect(wrapper.update().instance().global.settings[appConstants.ROW_HEIGHT]).toEqual(rowHeight);
    });

    it('when only auto refresh setting is present', async () => {
      const setting = {name: 'timezone', value: 'Atlantic/Reykjavik', _id: 2};
      const initialFetchSize = {name: 'initial_fetch_size', value: 50, _id: 3};
      const rowHeight = {name: 'row_height', value: 70, _id: 4};
      const autoRefreshSetting = {
        name: appConstants.AUTO_REFRESH_INTERVAL,
        value: 60,
        _id: 1
      };
      mockAxios.mockResponse({status: 200, data: [{key: 'default', path: '/test', name: 'test_db'}]});
      mockAxios.mockResponse({status: 200, data: {key: 'default', name: 'test_db'}});
      mockAxios.mockResponse({status: 200, data: [autoRefreshSetting]});
      mockAxios.mockResponse({status: 200, data: {version: '1.0.0'}});
      await tick();

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
      mockAxios.mockResponse({status: 201, data: setting});
      mockAxios.mockResponse({status: 201, data: initialFetchSize});
      mockAxios.mockResponse({status: 201, data: rowHeight});

      await tick();

      expect(wrapper.update().instance().global.settings[appConstants.SETTING_TIMEZONE]).toEqual(setting);
      expect(wrapper.update().instance().global.settings[appConstants.AUTO_REFRESH_INTERVAL]).toEqual(autoRefreshSetting);
      expect(wrapper.update().instance().global.settings[appConstants.INITIAL_FETCH_SIZE]).toEqual(initialFetchSize);
      expect(wrapper.update().instance().global.settings[appConstants.ROW_HEIGHT]).toEqual(rowHeight);
    });
  });
});
