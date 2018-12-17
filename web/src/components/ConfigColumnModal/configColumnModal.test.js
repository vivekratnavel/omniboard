import React from 'react';
import { ConfigColumnModal } from './configColumnModal';
import mockAxios from 'jest-mock-axios';
import { parseServerError } from '../Helpers/utils';

describe('ConfigColumnModal', () => {
  let wrapper = null;
  const closeHandler = jest.fn(() => wrapper.setProps({show: false})),
    dataUpdateHandler = jest.fn(),
    deleteHandler = jest.fn();

  const responseData = [
    {"_id":"5c16204663dfd3fe6a193610","name":"batch_size","config_path":"train.batch_size","__v":0},
    {"_id":"5c16ea82bea682411d7c0405","name":"settings_epochs","config_path":"train.settings.epochs","__v":0},
    {"_id":"5c16ebd6bea682411d7c0407","name":"Lr","config_path":"train.lr","__v":0}
  ];

  const runsConfigResponse = [
    {"message":"Hello world!","recipient":"world","seed":631323961,"train":{"batch_size":32,"epochs":100,"lr":0.01}},
    {"seed":637090657,"recipient":"world","message":"Hello world!","train":{"batch_size":32,"settings":{"epochs":12},"epochs":100,"lr":0.01}}
  ];

  beforeEach(() => {
    wrapper = shallow(
      <ConfigColumnModal handleClose={closeHandler} show={true} handleDataUpdate={dataUpdateHandler} handleDelete={deleteHandler}/>
    );
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.state().isLoadingColumns).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: runsConfigResponse});

    expect(wrapper.state().isLoadingColumns).toBeFalsy();
    expect(wrapper.update()).toMatchSnapshot();
  });

  it('should fetch config columns on mount', () => {
    mockAxios.mockResponse({status: 200, data: responseData});

    expect(mockAxios.get).toHaveBeenCalledWith('/api/v1/Runs', {params: {distinct: 'config'}});
    expect(wrapper.state().isLoadingConfigs).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: runsConfigResponse});

    expect(wrapper.state().isLoadingConfigs).toBeFalsy();
    expect(wrapper.state().configPaths).toHaveLength(4);
  });

  it('should handle close correctly', () => {
    wrapper.find('[test-attr="close-btn"]').simulate('click');

    expect(closeHandler).toHaveBeenCalledWith();
  });

  it('should handle data update correctly', done => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: runsConfigResponse});

    expect(wrapper.state().columns[0].id).toEqual(responseData[0]._id);
    expect(wrapper.find('[test-attr="apply-btn"]').props().disabled).toBeTruthy();
    wrapper.find('[test-attr="column-name-text-0"]').simulate('change', {
      target: {
        value: 'col_1'
      }
    });
    
    expect(wrapper.state().columns[0].columnName).toEqual('col_1');
    // Test if apply button is not disabled
    expect(wrapper.find('[test-attr="apply-btn"]').props().disabled).toBeFalsy();
    wrapper.find('[test-attr="apply-btn"]').simulate('click');

    mockAxios.mockResponse({status: 200, data: [responseData[0]]});

    setTimeout(() => {
      expect(dataUpdateHandler).toHaveBeenCalledWith();
      expect(closeHandler).toHaveBeenCalledWith();
      done();
    });
  });

  describe('should update columns correctly', () => {
    it('and handle create requests', async () => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.mockResponse({status: 200, data: runsConfigResponse});
      wrapper.find('[test-attr="column-name-text-0"]').simulate('change', {
        target: {
          value: 'col_1'
        }
      });
      wrapper.find('[test-attr="add-column-btn"]').simulate('click');
      wrapper.find('[test-attr="column-name-text-3"]').simulate('change', {
        target: {
          value: 'col_4'
        }
      });
      wrapper.find('[test-attr="config-path-3"]').simulate('change', {value: 'train.lr'});

      expect(mockAxios.post).toHaveBeenCalledTimes(0);
      wrapper.find('[test-attr="apply-btn"]').simulate('click');

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: []});
      await tick();

      expect(wrapper.state().isInProgress).toBeFalsy();
    });
  });

  describe('should handle delete correctly', () => {
    it('for server side delete', () => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.mockResponse({status: 200, data: runsConfigResponse});
      wrapper.find('[test-attr="delete-0"]').simulate('click');
      mockAxios.mockResponse({status: 204, data: []});

      expect(deleteHandler).toHaveBeenCalledWith(responseData[0].name);
      expect(wrapper.state().columns).toHaveLength(2);
      expect(wrapper.state().columns[0].id).toEqual(responseData[1]._id);
    });

    it('for client side delete', () => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.mockResponse({status: 200, data: runsConfigResponse});
      wrapper.find('[test-attr="add-column-btn"]').simulate('click');
      wrapper.find('[test-attr="delete-3"]').simulate('click');

      expect(mockAxios.delete).not.toHaveBeenCalled();
      expect(wrapper.state().columns).toHaveLength(3);
    })
  });

  describe('should handle errors correctly', () => {
    describe('for delete', () => {
      const errorResponse = {status: 404, message: 'unknown error'};
      it('server error', async () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: runsConfigResponse});
        wrapper.find('[test-attr="delete-0"]').simulate('click');
        mockAxios.mockResponse(errorResponse);
        await tick();

        expect(wrapper.state().columns).toHaveLength(3);
        expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
      });

      it('client error', () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: runsConfigResponse});
        wrapper.find('[test-attr="delete-0"]').simulate('click');
        mockAxios.mockError(errorResponse);

        expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
      });
    });

    it('for fetch config columns error', () => {
      mockAxios.mockError({status: 400, message: 'not found'});

      expect(wrapper.state().error).toEqual(parseServerError({status: 400, message: 'not found'}));
    });

    it('when there are no config paths', () => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.mockResponse({status: 200, data: []});

      expect(wrapper.state().error).toEqual('There are no nested config parameters available to add a new column');
    });

    describe('for apply', () => {
      it('client error', () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: runsConfigResponse});
        wrapper.find('[test-attr="apply-btn"]').simulate('click');

        expect(wrapper.state().error).toEqual('There are no changes to be applied');
      });

      it('server error', async () => {
        const errorResponse = {status: 400, response: {data: {message: 'cannot update'}}};
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: runsConfigResponse});
        wrapper.find('[test-attr="config-path-0"]').simulate('change', {value: 'train.epochs'});
        wrapper.find('[test-attr="apply-btn"]').simulate('click');
        mockAxios.mockError(errorResponse);
        await tick();

        expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
      });
    });

    it('for update', async() => {
      const errorResponse = {status: 400, message: 'unknown error'};
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.mockResponse({status: 200, data: runsConfigResponse});
      wrapper.find('[test-attr="column-name-text-0"]').simulate('change', {
        target: {
          value: 'col_1'
        }
      });
      wrapper.find('[test-attr="apply-btn"]').simulate('click');
      mockAxios.mockResponse(errorResponse);
      await tick();

      expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
    });
  });

  describe('should add columns correctly', () => {
    beforeEach(() => {
      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: runsConfigResponse});
      wrapper.find('[test-attr="add-column-btn"]').simulate('click');
      wrapper.find('[test-attr="column-name-text-0"]').simulate('change', {
        target: {
          value: 'col_1'
        }
      });
      wrapper.find('[test-attr="config-path-0"]').simulate('change', {value: 'train.lr'});
      wrapper.find('[test-attr="apply-btn"]').simulate('click');
    });

    afterEach(() => {
      mockAxios.reset();
      jest.clearAllMocks();
    });

    it('and update data handler', async () => {
      mockAxios.mockResponse({status: 201, data: []});
      await tick();

      expect(dataUpdateHandler).toHaveBeenCalledWith();
    });

    it('and handle errors', async () => {
      mockAxios.mockError({status: 400, response: {data: {message: 'cannot create'}}});
      await tick();

      expect(wrapper.state().error).toEqual(parseServerError({status: 400, response: {data: {message: 'cannot create'}}}));
    });
  });

  it('should detect correctly if form is dirty', () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: runsConfigResponse});
    wrapper.find('[test-attr="add-column-btn"]').simulate('click');

    expect(wrapper.instance().isFormDirty).toBeTruthy();
  });

  it('should handle config path change correctly', () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: runsConfigResponse});
    wrapper.find('[test-attr="config-path-0"]').simulate('change', {value: 'train.epochs'});

    expect(wrapper.state().columns[0].configPath).toEqual('train.epochs');
  });

  it('should reload data when modal dialog is reopened', () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: runsConfigResponse});
    wrapper.find('[test-attr="close-btn"]').simulate('click');

    wrapper.setProps({ show: true });

    expect(wrapper.update().state().isLoadingColumns).toBeTruthy();
    expect(wrapper.state().isLoadingConfigs).toBeTruthy();
    expect(mockAxios.get).toHaveBeenCalledWith('/api/v1/Runs', {params: {distinct: 'config'}});
  });
});
