import React from 'react';
import App from './index';
import mockAxios from 'jest-mock-axios';
import { toast } from "react-toastify";
import {parseServerError} from "../Helpers/utils";

describe('App component', () => {
  let wrapper = null;
  toast.error = jest.fn();

  beforeEach(async () => {
    wrapper = shallow(<App/>);
    await tick();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should reset cache', () => {
    const value = 'testValue';
    localStorage.setItem('test', value);

    expect(localStorage.getAllItems()['test']).toEqual(value);
    wrapper.find('[test-attr="reset-cache-button"]').simulate('click');

    expect(Object.keys(localStorage.getAllItems())).toHaveLength(0);
  });

  it('should show/hide ManageConfigColumns modal', () => {
    wrapper.find('[test-attr="manage-config-columns-button"]').simulate('click');

    expect(wrapper.state().showConfigColumnModal).toBeTruthy();
    wrapper.instance()._handleConfigColumnModalClose();

    expect(wrapper.state().showConfigColumnModal).toBeFalsy();
  });

  describe('should fetch database name on mount', () => {
    it('and handle success', async () => {
      expect(mockAxios.get).toHaveBeenCalledWith('/api/v1/database');
      mockAxios.mockResponse({status: 200, data: {name: 'test_db'}});

      expect(wrapper.update().state().dbName).toEqual('test_db');
    });

    it('and handle error', () => {
      const error = {status: 500, message: 'Unknown error'};
      mockAxios.mockError(error);

      expect(toast.error).toHaveBeenCalledWith(parseServerError(error));
    });
  });
});