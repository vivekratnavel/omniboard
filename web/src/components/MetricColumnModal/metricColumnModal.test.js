import React from 'react';
import mockAxios from 'jest-mock-axios';
import {parseServerError} from '../Helpers/utils';
import {MetricColumnModal} from './metricColumnModal';

describe('MetricColumnModal', () => {
  let wrapper = null;
  const closeHandler = jest.fn();
  const dataUpdateHandler = jest.fn();
  const deleteHandler = jest.fn();

  const responseData = [
    {_id: '5b5430c2893f17812d823d85', name: 'train_loss_min', metric_name: 'pretrain.train.loss', extrema: 'min'},
    {_id: '5b54eeb0893f17812d823d88', name: 'val_loss_max', metric_name: 'pretrain.val.loss', extrema: 'max'}
  ];

  const metricNamesResponse = ['pretrain.train.loss', 'pretrain.val.loss', 'finetune.train.loss', 'finetune.val.loss'];

  beforeEach(() => {
    wrapper = shallow(
      <MetricColumnModal show handleClose={closeHandler} handleDataUpdate={dataUpdateHandler} handleDelete={deleteHandler}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.state().isLoadingColumns).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: metricNamesResponse});

    expect(wrapper.state().isLoadingColumns).toBeFalsy();
    expect(wrapper.update()).toMatchSnapshot();
  });

  it('should fetch metric columns on mount', () => {
    mockAxios.mockResponse({status: 200, data: responseData});

    expect(mockAxios.get).toHaveBeenCalledWith('api/v1/Metrics', {params: {distinct: 'name'}});
    expect(wrapper.state().isLoadingMetricNames).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: metricNamesResponse});

    expect(wrapper.state().isLoadingMetricNames).toBeFalsy();
    expect(wrapper.state().metricNames).toHaveLength(4);
  });

  it('should handle close correctly', () => {
    wrapper.find('[test-attr="close-btn"]').simulate('click');

    expect(closeHandler).toHaveBeenCalledWith();
  });

  it('should handle data update correctly', done => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: metricNamesResponse});

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
      mockAxios.mockResponse({status: 200, data: metricNamesResponse});
      wrapper.find('[test-attr="column-name-text-0"]').simulate('change', {
        target: {
          value: 'col_1'
        }
      });
      wrapper.find('[test-attr="add-column-btn"]').simulate('click');
      wrapper.find('[test-attr="column-name-text-2"]').simulate('change', {
        target: {
          value: 'col_2'
        }
      });
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
      mockAxios.mockResponse({status: 200, data: metricNamesResponse});
      wrapper.find('[test-attr="delete-0"]').simulate('click');
      mockAxios.mockResponse({status: 204, data: []});

      expect(deleteHandler).toHaveBeenCalledWith('train_loss_min');
      expect(wrapper.state().columns).toHaveLength(1);
      expect(wrapper.state().columns[0].id).toEqual(responseData[1]._id);
    });

    it('for client side delete', () => {
      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: metricNamesResponse});
      wrapper.find('[test-attr="add-column-btn"]').simulate('click');
      wrapper.find('[test-attr="delete-0"]').simulate('click');

      expect(mockAxios.delete).not.toHaveBeenCalled();
      expect(wrapper.state().columns).toHaveLength(0);
    });
  });

  describe('should handle errors correctly', () => {
    describe('for delete', () => {
      const errorResponse = {status: 404, message: 'unknown error'};
      it('server error', async () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: metricNamesResponse});
        wrapper.find('[test-attr="delete-0"]').simulate('click');
        mockAxios.mockResponse(errorResponse);
        await tick();

        expect(wrapper.state().columns).toHaveLength(2);
        expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
      });

      it('client error', () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: metricNamesResponse});
        wrapper.find('[test-attr="delete-0"]').simulate('click');
        mockAxios.mockError(errorResponse);

        expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
      });
    });

    it('for fetch metric columns error', () => {
      mockAxios.mockError({status: 400, message: 'not found'});

      expect(wrapper.state().error).toEqual(parseServerError({status: 400, message: 'not found'}));
    });

    describe('for apply', () => {
      it('client error', () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: metricNamesResponse});
        wrapper.find('[test-attr="apply-btn"]').simulate('click');

        expect(wrapper.state().error).toEqual('There are no changes to be applied');
      });

      it('server error', async () => {
        mockAxios.mockResponse({status: 200, data: responseData});
        mockAxios.mockResponse({status: 200, data: metricNamesResponse});
        wrapper.find('[test-attr="metric-name-0"]').simulate('change', {value: 'metric_1'});
        wrapper.find('[test-attr="apply-btn"]').simulate('click');
        mockAxios.mockError({status: 400, response: {data: {message: 'cannot update'}}});
        await tick();

        expect(wrapper.state().error).toEqual(parseServerError({status: 400, response: {data: {message: 'cannot update'}}}));
      });
    });

    it('for update', async () => {
      const errorResponse = {status: 400, message: 'unknown error'};
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.mockResponse({status: 200, data: metricNamesResponse});
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
      mockAxios.mockResponse({status: 200, data: metricNamesResponse});
      wrapper.find('[test-attr="add-column-btn"]').simulate('click');
      wrapper.find('[test-attr="metric-name-0"]').simulate('change', {value: 'metric_1'});
      wrapper.find('[test-attr="extrema-0"]').simulate('change', {value: 'max'});
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
    mockAxios.mockResponse({status: 200, data: metricNamesResponse});
    wrapper.find('[test-attr="add-column-btn"]').simulate('click');

    expect(wrapper.instance().isFormDirty).toBeTruthy();
  });

  it('should handle metric name change correctly', () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: metricNamesResponse});
    wrapper.find('[test-attr="metric-name-0"]').simulate('change', {value: 'metric_1'});

    expect(wrapper.state().columns[0].metricName).toEqual('metric_1');
  });

  it('should handle extrema change correctly', () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.mockResponse({status: 200, data: metricNamesResponse});
    wrapper.find('[test-attr="extrema-1"]').simulate('change', {value: 'max'});

    expect(wrapper.state().columns[1].extrema).toEqual('max');
  });
});
