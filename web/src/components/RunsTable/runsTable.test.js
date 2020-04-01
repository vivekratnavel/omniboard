import React from 'reactn';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {parseServerError} from '../Helpers/utils';
import {STATUS} from '../../appConstants/status.constants';
import {generateMockResponse} from '../Helpers/testUtils';
import * as appConstants from '../../appConstants/app.constants';
import RunsTable, {DEFAULT_COLUMN_WIDTH, FILTER_OPERATOR_LABELS} from './runsTable';

describe('RunsTable', () => {
  let wrapper = null;
  let runsResponse = null;
  const tagsResponse = ['test'];
  const countResponse = {count: 4};
  const dbInfo = {key: 'default', name: 'test_db'};
  let metricColumnsResponse = null;
  let customColumnsResponse = null;
  let location = null;
  let history = null;
  const RealDate = Date;
  const constantDate = new Date(2018);
  const customColumnModalCloseHandler = jest.fn();
  const settingsModalCloseHandler = jest.fn();
  const initialSelect = '_id,heartbeat,experiment,command,host,stop_time,config,duration,' +
    'result,start_time,resources,format,status,omniboard,metrics,meta,pretrain_loss_min';
  const subsequentSelect = '_id,experiment.name,host.hostname,format,command,start_time,status,omniboard.tags,omniboard.notes,' +
    'resources,heartbeat,duration,result,stop_time,pretrain_loss_min,config.message,config.recipient,config.seed,' +
    'config.train,config.tags,meta.comment';
  toast.error = jest.fn();
  window.addEventListener = jest.fn();
  window.removeEventListener = jest.fn();

  beforeEach(async () => {
    // RunsTable deletes certain keys in this data and it produces unexpected results
    // That's why assigning data every time in "beforeEach" block
    runsResponse = [{_id: 12, experiment: {name: 'hello_config'}, format: 'MongoObserver-0.7.0', command: 'my_main', info: {}, host: {hostname: 'viveks-imac.lan'}, start_time: '2019-08-26T10:15:27.640Z', config: {message: 'Hello world!', recipient: 'world', seed: 748452106, train: {batch_size: 32, epochs: 100, lr: 0.01, settings: {epochs: 12}}, tags: 'tag1,tag2'}, status: 'COMPLETED', resources: [], heartbeat: '2019-08-26T10:16:13.734Z', result: 'Hello world!', stop_time: '2019-08-26T10:16:13.731Z', omniboard: {tags: ['test', 'test2', 'test3']}, duration: 46094, pretrain_loss_min: 1}, {_id: 11, experiment: {name: 'hello_config'}, format: 'MongoObserver-0.7.0', command: 'my_main', host: {hostname: 'viveks-imac.lan'}, start_time: '2019-08-26T10:09:15.417Z', config: {message: 'Hello world!', recipient: 'world', seed: 63143030, train: {batch_size: 32, epochs: 100, lr: 0.01, settings: {epochs: 12}}}, status: 'COMPLETED', resources: [], heartbeat: '2019-08-26T10:10:12.073Z', result: 'Hello world!', stop_time: '2019-08-26T10:10:12.070Z', duration: 56656, pretrain_loss_min: 3}, {_id: 10, experiment: {name: 'hello_config'}, format: 'MongoObserver-0.7.0', command: 'my_main', host: {hostname: 'viveks-imac.lan'}, start_time: '2019-08-26T10:04:57.446Z', config: {message: 'Hello world!', recipient: 'world', seed: 87987508, train: {batch_size: 32, epochs: 100, lr: 0.01, settings: {epochs: 12}}}, status: 'COMPLETED', resources: [], heartbeat: '2019-08-26T10:05:51.044Z', result: 'Hello world!', stop_time: '2019-08-26T10:05:51.040Z', duration: 53598, pretrain_loss_min: 2}, {_id: 9, experiment: {name: 'hello_config'}, format: 'MongoObserver-0.7.0', command: 'my_main', host: {hostname: 'viveks-imac.lan'}, start_time: '2019-08-26T09:58:54.573Z', config: {message: 'Hello world!', recipient: 'world', seed: 240075121, train: {batch_size: 32, epochs: 100, lr: 0.01, settings: {epochs: 12}}}, status: 'COMPLETED', resources: [], heartbeat: '2019-08-26T09:59:49.354Z', result: 'Hello world!', stop_time: '2019-08-26T09:59:49.352Z', duration: 54781, pretrain_loss_min: 1}];
    metricColumnsResponse = [{_id: '5b7ef4714232e2d5bec00e2f', name: 'pretrain_loss_min', metric_name: 'pretrain.train.loss', extrema: 'min', __v: 0}];
    customColumnsResponse = [
      {_id: '5c16204663dfd3fe6a193610', name: 'batch_size', config_path: 'config.train.batch_size', __v: 0},
      {_id: '5c16ea82bea682411d7c0405', name: 'settings_epochs', config_path: 'config.train.settings.epochs', __v: 0},
      {_id: '5c16ebd6bea682411d7c0407', name: 'Lr', config_path: 'config.train.lr', __v: 0}
    ];
    location = {
      search: ''
    };
    history = {
      push: jest.fn(queryString => {
        location = {
          search: queryString.substr(1)
        };
        wrapper.setProps({location});
      })
    };
    // Set an initial global state directly:
    React.setGlobal({
      settings: {
        [appConstants.SETTING_TIMEZONE]: {
          value: 'America/Los_Angeles'
        },
        [appConstants.AUTO_REFRESH_INTERVAL]: {
          value: appConstants.DEFAULT_AUTO_REFRESH_INTERVAL
        },
        [appConstants.INITIAL_FETCH_SIZE]: {
          value: runsResponse.length
        },
        [appConstants.ROW_HEIGHT]: {
          value: appConstants.DEFAULT_ROW_HEIGHT
        }
      }
    });

    await tick();
    wrapper = mount(
      <RunsTable dbInfo={dbInfo} showCustomColumnModal={false}
        handleCustomColumnModalClose={customColumnModalCloseHandler}
        showSettingsModal={false} location={location} history={history}
        handleSettingsModalClose={settingsModalCloseHandler}/>
    );
    global.Date = class extends RealDate {
      constructor(dateString) {
        super();
        return dateString ? new RealDate(dateString) : constantDate;
      }
    };
    await tick();
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    global.Date = RealDate;
    // Reset localStorage
    localStorage.clear();
    React.resetGlobal();
  });

  const initialRequestResponse = async () => {
    mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
    mockAxios.mockResponse({status: 200, data: customColumnsResponse});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: countResponse});
    await tick();
  };

  it('should render', async () => {
    expect(wrapper.state().isTableLoading).toBeTruthy();
    await initialRequestResponse();

    expect(wrapper.state().isTableLoading).toBeFalsy();
  });

  it('should open add remove metric columns modal', () => {
    wrapper.find('#add_remove_metric_columns').at(1).simulate('click');

    expect(wrapper.state().showMetricColumnModal).toBeTruthy();
    wrapper.find('[test-attr="close-btn"]').at(1).simulate('click');

    expect(wrapper.state().showMetricColumnModal).toBeFalsy();
  });

  it('should open compare runs modal', async () => {
    await initialRequestResponse();
    wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');
    wrapper.find('#compare_runs').at(1).simulate('click');
    // Should not open modal when only one row is selected
    expect(wrapper.update().state().showCompareColumnsModal).toBeFalsy();

    wrapper.update().find('[test-attr="cell-row_selection-1"]').simulate('click');
    wrapper.find('#compare_runs').at(1).simulate('click');
    expect(wrapper.update().state().showCompareColumnsModal).toBeTruthy();
    wrapper.instance()._handleCompareColumnsModalClose();

    expect(wrapper.state().showCompareColumnsModal).toBeFalsy();
  });

  describe('should handle multi-delete', () => {
    it('open confirmation dialog', async () => {
      await initialRequestResponse();
      wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');
      wrapper.find('#delete_runs').at(1).simulate('click');
      expect(wrapper.update().state().showDeleteConfirmationModal).toBeTruthy();
      expect(wrapper.update().state().isDeleteButtonDisabled).toBeFalsy();

      wrapper.update().find('[test-attr="cell-row_selection-1"]').simulate('click');
      wrapper.find('#delete_runs').at(1).simulate('click');
      expect(wrapper.update().state().showDeleteConfirmationModal).toBeTruthy();
      expect(wrapper.update().state().isDeleteButtonDisabled).toBeFalsy();
    });

    it('should close confirmation dialog', async () => {
      await initialRequestResponse();
      const event = {
        stopPropagation: jest.fn()
      };
      wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');
      wrapper.update().find('[test-attr="cell-row_selection-1"]').simulate('click');
      wrapper.find('#delete_runs').at(1).simulate('click');
      expect(wrapper.update().state().showDeleteConfirmationModal).toBeTruthy();
      wrapper.find('[test-attr="close-btn"]').at(1).simulate('click', event);
      expect(wrapper.update().state().showDeleteConfirmationModal).toBeFalsy();
    });

    describe('should call delete api and handle', () => {
      const event = {
        stopPropagation: jest.fn()
      };
      const artifactsResponse = [{
        file_id: '5c41711ea9eee738179295aa',
        name: 'result.pickle'
      }, {file_id: '5c41711ea9eee738179295ac', name: 'test.svg'}, {
        file_id: '5c41711ea9eee738179295ae',
        name: 'output.png'
      }];
      const sourcesResponse = [
        [
          'hello2.py',
          '5d637fb55b192c78cf121928'
        ],
        [
          'hello1.py',
          '5d637fb55b192c78cf121929'
        ]
      ];
      toast.error = jest.fn();
      toast.success = jest.fn();
      beforeEach(async () => {
        await initialRequestResponse();
        wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');
        wrapper.update().find('[test-attr="cell-row_selection-1"]').simulate('click');
        mockAxios.reset();
        wrapper.find('#delete_runs').at(1).simulate('click');
        wrapper.find('[test-attr="delete-btn"]').at(1).simulate('click', event);
      });

      it('success for metrics', async () => {
        expect(mockAxios.get).toHaveBeenCalledTimes(4);
        mockAxios.mockResponse({status: 200, data: {_id: 12, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({
          status: 200,
          data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]
        });
        mockAxios.mockResponse({status: 200, data: {_id: 11, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({
          status: 200,
          data: [{_id: '5ca67d6f11421a00e53d49fc', count: 1}, {_id: '5ca6805e11421a04b4ba8b48', count: 2}]
        });

        // Even if no metrics are present, a delete will be called on metrics
        // since deletes are idempotent.
        // The second delete is for the Run entry in Runs collection.
        // In between there will be delete calls to source files with count 1
        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(6);
        expect(mockAxios.delete.mock.calls[0]).toEqual(['api/v1/Metrics/', {params: {query: '{"run_id":12}'}}]);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['api/v1/Runs/12']);
        expect(mockAxios.delete.mock.calls[2]).toEqual(['api/v1/Metrics/', {params: {query: '{"run_id":11}'}}]);
        expect(mockAxios.delete.mock.calls[3][0]).toEqual('api/v1/Fs.chunks/');
        expect(mockAxios.delete.mock.calls[4][0]).toEqual('api/v1/Fs.files/');
        expect(mockAxios.delete.mock.calls[5]).toEqual(['api/v1/Runs/11']);
        generateMockResponse(204, 6);
        await tick();

        expect(event.stopPropagation).toHaveBeenCalledWith();
        expect(toast.success).toHaveBeenCalledTimes(2);
        expect(wrapper.update().state().runsCount).toEqual(2);
        expect(wrapper.update().state().selectedRows.size).toEqual(0);
        expect(wrapper.update().state().isDeleteInProgress).toBeFalsy();
      });

      it('success for artifacts', async () => {
        expect(wrapper.update().state().runsCount).toEqual(4);
        mockAxios.mockResponse({status: 200, data: {_id: 12, artifacts: artifactsResponse, experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 5}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});
        mockAxios.mockResponse({status: 200, data: {_id: 11, artifacts: artifactsResponse, experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 12}]});

        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(8);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['api/v1/Fs.chunks/', {params: {query: '{"$or":[{"files_id":' +
              '"5c41711ea9eee738179295aa"},{"files_id":"5c41711ea9eee738179295ac"},{"files_id":"5c41711ea9eee738179295ae"}]}'}}]);
        expect(mockAxios.delete.mock.calls[2]).toEqual(['api/v1/Fs.files/', {params: {query: '{"$or":[{"_id":' +
              '"5c41711ea9eee738179295aa"},{"_id":"5c41711ea9eee738179295ac"},{"_id":"5c41711ea9eee738179295ae"}]}'}}]);
        generateMockResponse(204, 8);
        await tick();

        expect(toast.success).toHaveBeenCalledTimes(2);
        expect(wrapper.update().state().runsCount).toEqual(2);
        expect(wrapper.update().state().selectedRows.size).toEqual(0);
      });

      it('success for both artifacts and sources', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 12, artifacts: artifactsResponse, experiment: {sources: sourcesResponse}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});
        mockAxios.mockResponse({status: 200, data: {_id: 11, artifacts: artifactsResponse, experiment: {sources: sourcesResponse}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 5}, {_id: '5ca6805e11421a04b4ba8b48', count: 3}]});

        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(8);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['api/v1/Fs.chunks/', {params: {query: '{"$or":[{"files_id":' +
              '"5c41711ea9eee738179295aa"},{"files_id":"5c41711ea9eee738179295ac"},{"files_id":"5c41711ea9eee738179295ae"}]}'}}]);
        expect(mockAxios.delete.mock.calls[2]).toEqual(['api/v1/Fs.files/', {params: {query: '{"$or":[{"_id":' +
              '"5c41711ea9eee738179295aa"},{"_id":"5c41711ea9eee738179295ac"},{"_id":"5c41711ea9eee738179295ae"}]}'}}]);
        expect(mockAxios.delete.mock.calls[3]).toEqual(['api/v1/Runs/12']);
        generateMockResponse(204, 4);
        await tick();

        expect(toast.success).toHaveBeenCalledTimes(1);
        generateMockResponse(204, 4);
        await tick();
        expect(toast.success).toHaveBeenCalledTimes(2);
      });

      it('success for both artifacts and sources with files', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 12, artifacts: artifactsResponse, experiment: {sources: sourcesResponse}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 1}, {_id: '5ca6805e11421a04b4ba8b48', count: 1}]});
        mockAxios.mockResponse({status: 200, data: {_id: 11, artifacts: artifactsResponse, experiment: {sources: sourcesResponse}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 1}, {_id: '5ca6805e11421a04b4ba8b48', count: 1}]});
        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(12);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['api/v1/Fs.chunks/', {params: {query: '{"$or":[{"files_id":' +
              '"5c41711ea9eee738179295aa"},{"files_id":"5c41711ea9eee738179295ac"},{"files_id":"5c41711ea9eee738179295ae"}]}'}}]);
        expect(mockAxios.delete.mock.calls[2]).toEqual(['api/v1/Fs.files/', {params: {query: '{"$or":[{"_id":' +
              '"5c41711ea9eee738179295aa"},{"_id":"5c41711ea9eee738179295ac"},{"_id":"5c41711ea9eee738179295ae"}]}'}}]);
        expect(mockAxios.delete.mock.calls[3]).toEqual(['api/v1/Fs.chunks/', {params: {query: '{"$or":[{"files_id":' +
              '"5ca67d6f11421a00e53d49fc"},{"files_id":"5ca6805e11421a04b4ba8b48"}]}'}}]);
        expect(mockAxios.delete.mock.calls[4]).toEqual(['api/v1/Fs.files/', {params: {query: '{"$or":[{"_id":' +
              '"5ca67d6f11421a00e53d49fc"},{"_id":"5ca6805e11421a04b4ba8b48"}]}'}}]);
        expect(mockAxios.delete.mock.calls[5]).toEqual(['api/v1/Runs/12']);
        generateMockResponse(204, 12);
        await tick();

        expect(toast.success).toHaveBeenCalledTimes(2);
      });

      it('unknown error', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: []});
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: []});
        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(4);
        mockAxios.mockResponse({status: 204});
        mockAxios.mockResponse({status: 400});
        mockAxios.mockResponse({status: 204});
        mockAxios.mockResponse({status: 204});
        await tick();
        expect(toast.error).toHaveBeenCalledWith('An unknown error occurred!', {autoClose: 5000});
      });

      it('error for get', async () => {
        const errResponse = {status: 500, message: 'unknown error'};
        mockAxios.mockError(errResponse);
        await tick();

        expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
      });

      it('error for delete calls', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});
        await tick();
        const errResponse = {status: 500, message: 'unknown error'};
        mockAxios.mockError(errResponse);
        await tick();

        expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
      });
    });
  });

  describe('should load data', () => {
    const getAPIArguments = (select, queryString) => {
      return ['api/v1/Runs', {
        params: {
          select,
          sort_by: '_id',
          order_by: '-1',
          query: queryString,
          limit: React.getGlobal().settings[appConstants.INITIAL_FETCH_SIZE].value
        }
      }];
    };

    const testFilter = async expectedOutput => {
      wrapper.instance()._handleAddFilterClick();

      expect(mockAxios.get.mock.calls).toHaveLength(2);
      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: []});
      await tick();

      expect(mockAxios.get.mock.calls).toHaveLength(5);
      const queryString = JSON.stringify({$and: [{$or: expectedOutput}]});
      expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(subsequentSelect, queryString));
    };

    it('with status filter query', async () => {
      let queryString = {};

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      mockAxios.mockResponse({status: 200, data: customColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(initialSelect, JSON.stringify(queryString)));
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: countResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => ['running']
        }
      };
      queryString = JSON.stringify({$and: [{$or: [{status: {$eq: 'running'}}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      mockAxios.mockResponse({status: 200, data: customColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(subsequentSelect, queryString));
    });

    it('with status filter as running', async () => {
      await initialRequestResponse();
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => [STATUS.RUNNING]
        }
      };
      const queryString = JSON.stringify({$and: [{$or: [{status: {$eq: STATUS.RUNNING}}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      mockAxios.mockResponse({status: 200, data: customColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(subsequentSelect, queryString));
    });

    it('with status filter as running and probably_dead', async () => {
      await initialRequestResponse();

      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => [STATUS.PROBABLY_DEAD, STATUS.RUNNING]
        }
      };
      const queryString = JSON.stringify({$and: [{$or: [{status: {$eq: STATUS.PROBABLY_DEAD}}, {status: {$eq: STATUS.RUNNING}}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      mockAxios.mockResponse({status: 200, data: customColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(subsequentSelect, queryString));
    });

    it('with filter on tags $eq operator', async () => {
      await initialRequestResponse();
      mockAxios.reset();
      wrapper.setState({
        filterColumnName: 'config.tags',
        filterColumnOperator: '$eq',
        filterColumnValue: ['test']
      });

      await testFilter([{'config.tags': {$eq: ['test']}}, {'omniboard.tags': {$eq: ['test']}}]);
    });

    it('with filter on tags $in operator', async () => {
      await initialRequestResponse();
      mockAxios.reset();
      wrapper.setState({
        filterColumnName: 'config.tags',
        filterColumnOperator: '$in',
        filterColumnValue: ['test', 'test2']
      });

      await testFilter([{'config.tags': {$in: ['test', 'test2']}}, {'omniboard.tags': {$in: ['test', 'test2']}}]);
    });

    it('with filter on notes', async () => {
      await initialRequestResponse();
      mockAxios.reset();
      wrapper.setState({
        filterColumnName: 'omniboard.notes',
        filterColumnOperator: '$regex',
        filterColumnValue: ['test']
      });

      await testFilter([{'meta.comment': {$regex: ['test']}}, {'omniboard.notes': {$regex: ['test']}}]);
    });

    it('the second time when other states are retrieved from local storage', async () => {
      await initialRequestResponse();
      wrapper.instance().loadData();
      await initialRequestResponse();

      expect(wrapper.state().isTableLoading).toBeFalsy();
    });

    it('with empty response', async () => {
      await initialRequestResponse();
      wrapper.instance().loadData();
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      mockAxios.mockResponse({status: 200, data: customColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: []});
      mockAxios.mockResponse({status: 200, data: countResponse});
      await tick();

      expect(wrapper.update().state().isTableLoading).toBeFalsy();
      expect(wrapper.update().state().data).toHaveLength(0);
      expect(wrapper.update().state().sortedData.getSize()).toEqual(0);
    });
  });

  describe('should load partial updates', () => {
    const getAPIArguments = (api, select, queryString) => {
      return [api, {
        params: {
          select,
          sort_by: '_id',
          order_by: '-1',
          query: queryString,
          limit: React.getGlobal().settings[appConstants.INITIAL_FETCH_SIZE].value
        }
      }];
    };

    const runsApi = 'api/v1/Runs';
    const countApi = 'api/v1/Runs/count';

    beforeEach(async () => {
      await initialRequestResponse();
      mockAxios.reset();
    });

    it('and render correctly', async () => {
      // It should fetch count with the same filter query
      const queryString = '{}';
      const updateResponse = [
        {_id: 227, status: 'RUNNING', result: null, start_time: '2017-12-09T03:52:27.032Z', heartbeat: '2017-12-09T19:02:33.590Z', omniboard: {notes: 'testing note!', tags: ['tag1', 'test']}, metrics: []},
        {_id: 226, status: 'COMPLETED', result: null, start_time: '2017-12-09T03:52:27.032Z', heartbeat: '2017-12-09T19:02:33.590Z', omniboard: {notes: 'UPDATED NOTE', tags: ['tag1', 'test']}, metrics: []}
      ];
      const updateCountResponse = {count: 6};
      wrapper.instance().loadPartialUpdates();

      expect(wrapper.state().isFetchingUpdates).toBeTruthy();
      expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments(countApi, subsequentSelect, queryString));
      expect(wrapper.state().data).toHaveLength(4);
      expect(wrapper.state().sortedData.getSize()).toEqual(4);
      mockAxios.mockResponse({status: 200, data: updateCountResponse});

      await tick();

      expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments(runsApi, subsequentSelect, queryString));
      mockAxios.mockResponse({status: 200, data: updateResponse});

      await tick();

      expect(wrapper.state().data).toHaveLength(4);
      expect(wrapper.state().sortedData.getSize()).toEqual(4);
      expect(wrapper.state().newData).toHaveLength(2);
      expect(wrapper.state().newRunsCount).toEqual(2);
      expect(wrapper.state().newData.filter(run => run._id === 227)).toHaveLength(1);
      expect(wrapper.state().newData.find(run => run._id === 226).notes).toEqual('UPDATED NOTE');
    });

    it('for running experiments', async () => {
      const {data, sortedData} = wrapper.state();
      data.push({_id: 20, status: 'RUNNING'});
      sortedData.data = data;
      wrapper.setState({data, sortedData});
      const updateCountResponse = {count: 4};
      wrapper.instance().loadPartialUpdates();

      mockAxios.mockResponse({status: 200, data: updateCountResponse});

      const queryString = {
        $and: [{
          _id: {$in: [20]}
        }]
      };
      expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments(runsApi, subsequentSelect, queryString));
      mockAxios.mockResponse({status: 200, data: [{_id: 20, status: 'COMPLETED'}]});

      expect(wrapper.update().state().isFetchingUpdates).toBeFalsy();
      expect(wrapper.update().state().dataVersion).toEqual(1);
      expect(wrapper.update().state().data.find(run => run._id === 20).status).toEqual('COMPLETED');
    });
  });

  it('should initialize empty note with comment', async () => {
    runsResponse = [{_id: 226, config: {degree_increment: 15, lr_drop_rate: 0.1, model_name: 'vgg16', num_views: 12, resume: null, random_rotate: false, pretrain_epochs: 5, comment: '', batch_size: 10, keep_cnn2_lr: false, method: 'max', val_label_csv: null, seed: 577224600, finetune_learning_rate: 0.0002, random_y_flip: false, debug: false, save_images: false, finetune_layers: 12, dim: 227, gpu_device_ids: [0], optimizer_name: 'SGD', learning_rate: 0.00033, dataset: 'train', epochs_per_lr_drop: 100, split_id: 2, cnn1_pretrained: true, part_name: 'waist', random_x_flip: true, dropout_p: 0.4, random_crop: false, weight_decay: 0.0001, num_classes: 1, finetune_epochs: 150, run_id: 'vgg16-waist-split-2', is_grayscale: false}, format: 'MongoObserver-0.7.0', stop_time: '2017-12-09T19:02:33.588Z', command: 'main', resources: [], meta: {command: 'main', comment: 'test comment'}, status: 'COMPLETED', result: null, heartbeat: '2017-12-09T19:02:33.590Z', metrics: []}];
    mockAxios.mockResponse({status: 200, data: []});
    mockAxios.mockResponse({status: 200, data: []});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: countResponse});
    await tick();

    expect(wrapper.state().data[0].notes).toEqual('test comment');
  });

  describe('should handle errors correctly', () => {
    describe('for error in initial load', () => {
      const errResponse = {status: 500, message: 'unknown error'};
      it('metrics response', async () => {
        mockAxios.mockError(errResponse);
        await tick();

        expect(wrapper.state().isError).toBeTruthy();
        expect(wrapper.state().errorMessage).toEqual(parseServerError(errResponse));
      });

      it('runs response', async () => {
        mockAxios.mockResponse({status: 200, data: []});
        mockAxios.mockResponse({status: 200, data: []});
        await tick();

        mockAxios.mockError(errResponse);
        mockAxios.mockResponse({status: 200, data: tagsResponse});
        mockAxios.mockResponse({status: 200, data: countResponse});
        await tick();

        expect(wrapper.state().isError).toBeTruthy();
        expect(wrapper.state().errorMessage).toEqual(parseServerError(errResponse));
      });
    });
  });

  it('should expand row correctly', async () => {
    await initialRequestResponse();
    wrapper.update().find('[test-attr="cell-row_expander-0"]').simulate('click');

    expect(wrapper.state().expandedRows).toContain(0);
    expect(wrapper.state().scrollToRow).toEqual(0);
    // Clicking on an expanded row should collapse it
    wrapper.find('[test-attr="cell-row_expander-0"]').simulate('click');

    expect(wrapper.state().expandedRows.size).toEqual(0);
    expect(wrapper.state().scrollToRow).toBeNull();
  });

  describe('should handle multi select', () => {
    beforeEach(async () => {
      await initialRequestResponse();
    });

    it('click on row', async () => {
      wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');

      expect(wrapper.instance().state.selectedRows.size).toEqual(1);
      expect(wrapper.instance().state.selectedRows.has(0)).toBeTruthy();
    });

    it('click on select-all', async () => {
      wrapper.update().find('[test-attr="header-row_selection"]').simulate('click');

      expect(wrapper.instance().state.selectedRows.size).toEqual(4);
      expect(wrapper.instance().state.selectedRows.has(3)).toBeTruthy();
      expect(wrapper.state().selectAll).toBeTruthy();
    });

    it('deselect row', async () => {
      wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');
      expect(wrapper.instance().state.selectedRows.size).toEqual(1);
      expect(wrapper.state().selectAll).toBeTruthy();
      expect(wrapper.state().selectAllIndeterminate).toBeTruthy();
      wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');
      expect(wrapper.instance().state.selectedRows.size).toEqual(0);
      expect(wrapper.state().selectAll).toBeFalsy();
      expect(wrapper.state().selectAllIndeterminate).toBeFalsy();
    });

    it('deselect all', async () => {
      wrapper.update().find('[test-attr="cell-row_selection-0"]').simulate('click');

      expect(wrapper.state().selectAllIndeterminate).toBeTruthy();
      wrapper.update().find('[test-attr="header-row_selection"]').simulate('click');

      expect(wrapper.instance().state.selectedRows.size).toEqual(0);
    });
  });

  describe('should handle tag change correctly', () => {
    const rowIndex = 0;
    beforeEach(async () => {
      await initialRequestResponse();
      wrapper.instance()._handleTagChange(rowIndex)([{value: 'tag1'}, {value: 'tag2'}]);
    });

    it('for error response', () => {
      const errResponse = {status: 500, request: {}};

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeTruthy();
      mockAxios.mockError(errResponse);

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeFalsy();
      expect(wrapper.state().tags).not.toContain('tag1');
      expect(toast.error).toHaveBeenCalledWith('Error: No response was received from the server.');
    });

    it('for success response', () => {
      expect(mockAxios.put).toHaveBeenCalledWith('api/v1/Runs/' + runsResponse[rowIndex]._id, {
        omniboard: {
          tags: ['tag1', 'tag2']
        }
      });

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeTruthy();
      mockAxios.mockResponse({status: 200});

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeFalsy();
      expect(wrapper.state().tags).toContain('tag1');
      expect(wrapper.state().tags).toContain('tag2');
      expect(wrapper.state().sortedData.getObjectAt(rowIndex).tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('should handle notes change correctly', () => {
    const rowIndex = 0;
    const notes = 'test notes';

    beforeEach(async () => {
      await initialRequestResponse();
      wrapper.instance()._handleNotesChange(rowIndex)('name', notes);
    });

    it('for error response', () => {
      const errResponse = {status: 500, message: 'unknown error'};
      mockAxios.mockError(errResponse);

      expect(toast.error).toHaveBeenCalledWith(parseServerError(errResponse));
    });

    it('for success response', () => {
      expect(mockAxios.put).toHaveBeenCalledWith('api/v1/Runs/' + runsResponse[rowIndex]._id, {
        omniboard: {
          notes
        }
      });
      mockAxios.mockResponse({status: 200});

      expect(wrapper.state().sortedData.getObjectAt(rowIndex).notes).toEqual(notes);
    });
  });

  describe('should handle delete experiment run', () => {
    let runId = 12;
    beforeEach(async () => {
      await initialRequestResponse();
    });

    it('when run is present', () => {
      expect(wrapper.state().data.filter(item => item._id === runId)).toHaveLength(1);
      wrapper.instance()._handlePostDeleteRun(runId);

      expect(wrapper.state().data.filter(item => item._id === runId)).toHaveLength(0);
    });

    it('when run is not present', () => {
      runId = 100;
      const dataLength = wrapper.state().data.length;
      wrapper.instance()._handlePostDeleteRun(runId);

      expect(wrapper.state().data).toHaveLength(dataLength);
    });
  });

  it('should handle sort change correctly', async () => {
    const getAPIArguments = (select, sortBy, orderBy) => {
      return ['api/v1/Runs', {
        params: {
          select,
          sort_by: sortBy,
          order_by: orderBy,
          query: '{}',
          limit: React.getGlobal().settings[appConstants.INITIAL_FETCH_SIZE].value
        }
      }];
    };

    await initialRequestResponse();

    const event = {
      preventDefault: jest.fn()
    };
    wrapper.update().find('[test-attr="header-sort-_id"]').simulate('click', event);

    expect(event.preventDefault).toHaveBeenCalledWith();
    expect(wrapper.state().sort._id).toEqual('DESC');

    let sortBy = '_id';
    let orderBy = '-1';
    expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(initialSelect, sortBy, orderBy));

    await initialRequestResponse();

    wrapper.update().find('[test-attr="header-sort-_id"]').simulate('click', event);
    sortBy = '_id';
    orderBy = '-1';
    expect(wrapper.state().sort._id).toEqual('ASC');
    expect(mockAxios.get.mock.calls[2]).toEqual(getAPIArguments(initialSelect, sortBy, orderBy));
  });

  describe('should handle column show/hide correctly', () => {
    beforeEach(async () => {
      await initialRequestResponse();
    });

    afterEach(() => {
      wrapper.setState({
        dropdownOptions: []
      });
    });

    it('when close button is clicked in header', () => {
      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeTruthy();
      wrapper.update().find('[test-attr="header-_id"]').at(1).simulate('mouseover');
      wrapper.update().find('[test-attr="header-sort-close-_id"]').simulate('click', '_id');

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeFalsy();
      expect(wrapper.state().columnOrder).not.toContain('_id');
    });

    it('when a column is checked/unchecked in show/hide columns', () => {
      wrapper.instance().showHideColumnsDomNode = {
        $multiselect: {
          val: () => ['start_time', 'heartbeat', 'stop_time']
        }
      };

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeTruthy();
      wrapper.instance()._handleShowHideColumnsDropdownChange({});

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeFalsy();
      expect(wrapper.state().columnOrder).not.toContain('_id');
      expect(wrapper.state().columnOrder).toHaveLength(3);
      expect(wrapper.state().dropdownOptions.find(option => option.value === 'start_time').selected).toBeTruthy();
    });
  });

  describe('should handle column reorder correctly', () => {
    beforeEach(async () => {
      await initialRequestResponse();
    });

    it('when columnAfter is present', () => {
      const event = {
        reorderColumn: 'notes',
        columnAfter: '_id'
      };
      wrapper.instance()._onColumnReorderEndCallback(event);
      const indexReorderColumn = wrapper.state().columnOrder.indexOf(event.reorderColumn);

      expect(wrapper.state().columnOrder[indexReorderColumn + 1]).toEqual(event.columnAfter);
      expect(wrapper.state().dropdownOptions[indexReorderColumn + 1].value).toEqual(event.columnAfter);
    });

    it('when columnAfter is not present', () => {
      const event = {
        reorderColumn: 'heartbeat'
      };
      wrapper.instance()._onColumnReorderEndCallback(event);
      const indexReorderColumn = wrapper.state().columnOrder.indexOf(event.reorderColumn);

      expect(indexReorderColumn).toEqual(wrapper.state().columnOrder.length - 1);
      expect(wrapper.state().dropdownOptions[indexReorderColumn].value).toEqual(event.reorderColumn);
    });
  });

  it('should handle metric column delete correctly', async () => {
    await initialRequestResponse();
    wrapper.instance()._handleColumnDelete('_id');

    expect(wrapper.state().columnOrder.indexOf('_id')).toEqual(-1);
    expect(wrapper.state().dropdownOptions.indexOf('_id')).toEqual(-1);
    expect(Object.keys(wrapper.state().columnWidths).indexOf('_id')).toEqual(-1);
  });

  describe('should add or remove filters', () => {
    beforeEach(async () => {
      await initialRequestResponse();
    });

    afterEach(() => {
      wrapper.setState({
        filters: {
          status: [],
          advanced: []
        },
        filterColumnName: '',
        filterColumnOperator: '$eq',
        filterColumnValue: ''
      });
    });

    it('should add filter', async () => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      mockAxios.mockResponse({status: 200, data: []});
      await tick();
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$eq'});
      wrapper.find('[test-attr="filter-column-value"]').at(1).prop('onChange')({value: 'host1'});
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filters.advanced[0].value).toEqual('host1');
      expect(wrapper.state().filters.advanced[0].name).toEqual('host.hostname');
      expect(wrapper.state().filterColumnName).toEqual('');
      expect(wrapper.state().filterColumnOperator).toEqual('$eq');
      expect(wrapper.state().filterColumnValue).toEqual('');
      expect(wrapper.find('.tags-container').find('.item').find('.tag').at(0).text()).toEqual(`Hostname ${FILTER_OPERATOR_LABELS.$eq} host1`);
    });

    it('should add filter with $in operator', async () => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: []});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});
      wrapper.find('[test-attr="filter-column-value"]').at(1).prop('onChange')([{value: 'host1'}, {value: 'host2'}]);
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filters.advanced[0].value).toEqual(['host1', 'host2']);
      expect(wrapper.state().filters.advanced[0].name).toEqual('host.hostname');
      expect(wrapper.state().filterColumnName).toEqual('');
      expect(wrapper.state().filterColumnOperator).toEqual('$eq');
      expect(wrapper.state().filterColumnValue).toEqual('');
      expect(wrapper.find('.tags-container').find('.item').find('.tag').at(0).text()).toEqual(`Hostname ${FILTER_OPERATOR_LABELS.$in} host1,host2`);
    });

    it('should handle add filter errors', async () => {
      expect(wrapper.state().filterColumnNameError).toBeFalsy();
      expect(wrapper.state().filterColumnValueError).toBeFalsy();
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filterColumnNameError).toBeTruthy();
      expect(wrapper.state().filterColumnValueError).toBeFalsy();
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.update().state().filterColumnNameError).toBeFalsy();
      expect(wrapper.state().filterColumnValueError).toBeTruthy();
    });

    it('should load value dropdown options', async () => {
      const response = ['host1', 'host2'];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      await tick();
      const expectedOptions = response.map(value => {
        return {label: value, value};
      });
      const dropdownOptions = wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options;

      expect(dropdownOptions).toEqual(expectedOptions);
    });

    it('should load value dropdown options for status', async () => {
      mockAxios.reset();
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'status'});
      expect(mockAxios.get.mock.calls).toHaveLength(0);

      await tick();
      const dropdownOptions = wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options;

      expect(dropdownOptions).toHaveLength(7);
      expect(dropdownOptions.some(option => option.value === STATUS.PROBABLY_DEAD)).toBeTruthy();
    });

    it('should load value dropdown options for duration', async () => {
      mockAxios.reset();
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'duration'});
      expect(mockAxios.get.mock.calls).toHaveLength(0);

      await tick();
      const dropdownOptions = wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options;

      expect(dropdownOptions).toHaveLength(7);
      expect(dropdownOptions.some(option => option.value === '1h')).toBeTruthy();
    });

    it('should change value dropdown to multiselect', async () => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().isMulti).toBeFalsy();

      mockAxios.mockResponse({status: 200, data: ['host1', 'host2']});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().isMulti).toBeTruthy();
    });

    it('value dropdown should allow multiple values', async () => {
      const response = ['host1', 'host2'];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});
      wrapper.update().find('[test-attr="filter-column-value"]').at(1).prop('onChange')([{value: 'host1'}, {value: 'host2'}]);
      const expectedValues = response.map(value => {
        return {label: value, value};
      });

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().value).toEqual(expectedValues);
    });

    it('should handle value dropdown options error', async () => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 400});

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options).toHaveLength(0);
    });

    it('should remove a filter', async () => {
      wrapper.setState({
        filterColumnName: '_id',
        filterColumnOperator: '$gt',
        filterColumnValue: '7'
      });
      wrapper.instance()._handleAddFilterClick();
      wrapper.setState({
        filterColumnName: 'bool',
        filterColumnOperator: '$eq',
        filterColumnValue: 'true'
      });
      wrapper.instance()._handleAddFilterClick();

      expect(wrapper.update().state().filters.advanced).toHaveLength(2);
      expect(wrapper.state().filters.advanced[0].value).toEqual('7');
      wrapper.update().find('.tags-container').find('.item').at(0).find('.is-delete').simulate('click');

      expect(wrapper.update().state().filters.advanced).toHaveLength(1);
      expect(wrapper.state().filters.advanced[0].value).toEqual('true');
    });
  });

  describe('should fetch next set of runs', () => {
    let fetchRunsRangePromise = null;
    beforeEach(async () => {
      await initialRequestResponse();
      mockAxios.reset();
      fetchRunsRangePromise = wrapper.instance()._fetchRunsRange(5);
    });

    it('and handle success', async () => {
      runsResponse.push({_id: 20});
      const countResponse = {count: 5};

      expect(mockAxios.get.mock.calls).toHaveLength(2);
      expect(wrapper.state().dataVersion).toEqual(0);

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: countResponse});

      await tick();
      expect(wrapper.update().state().data).toHaveLength(5);
      expect(wrapper.update().state().dataVersion).toEqual(1);
      expect(wrapper.update().state().runsCount).toEqual(5);
      expect(wrapper.update().state().data.some(col => col._id === 20)).toBeTruthy();
    });

    it('and handle error', async () => {
      const errResponse = {status: 500, message: 'unknown error'};
      mockAxios.mockError(errResponse);
      let error = null;
      await fetchRunsRangePromise.catch(error2 => {
        error = error2;
      });

      expect(error).toEqual(errResponse);
      expect(wrapper.update().state().dataVersion).toEqual(0);
    });
  });

  it('should handle autoRefreshUpdate', async () => {
    await initialRequestResponse();

    wrapper.instance()._startPolling = jest.fn();
    wrapper.instance()._handleAutoRefreshUpdate();

    expect(wrapper.instance()._startPolling).toHaveBeenCalledTimes(1);

    wrapper.setState({autoRefresh: false});

    await tick();
    expect(wrapper.instance()._startPolling).toHaveBeenCalledTimes(1);
  });

  it('should handle loadNewRuns', async () => {
    await initialRequestResponse();
    runsResponse = runsResponse.concat([{_id: 20}, {_id: 21}, {_id: 22}]);
    wrapper.setState({
      newData: runsResponse,
      newRunsCount: 3
    });

    wrapper.instance()._handleLoadNewRuns();

    expect(wrapper.update().state().runsCount).toEqual(7);
    expect(wrapper.update().state().sortedData.getSize()).toEqual(7);
    expect(wrapper.update().state().sortedData.getDataArray()).toHaveLength(7);
    expect(wrapper.update().state().sortedData.getDataArray().some(col => col._id === 22)).toBeTruthy();
    expect(wrapper.update().state().newData).toEqual(null);
    expect(wrapper.update().state().newRunsCount).toEqual(0);
    expect(wrapper.update().state().data).toEqual(runsResponse);
    expect(wrapper.update().state().dataVersion).toEqual(1);
  });

  describe('should handle updateRuns', () => {
    beforeEach(async () => {
      await initialRequestResponse();
    });
    it('for deletion of columns', async () => {
      const {dropdownOptions, columnOrder, columnWidths} = wrapper.state();
      wrapper.instance().loadData();

      // When empty response is sent for custom columns,
      // the previous 3 custom columns should be deleted
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      mockAxios.mockResponse({status: 200, data: []});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: countResponse});
      await tick();

      expect(wrapper.update().state().dropdownOptions).toHaveLength(dropdownOptions.length - 3);
      expect(wrapper.update().state().columnOrder).toHaveLength(columnOrder.length - 3);
      expect(Object.keys(wrapper.update().state().columnWidths)).toHaveLength(Object.keys(columnWidths).length - 3);
      expect(wrapper.update().state().columnOrder).not.toContain('batch_size');
      expect(wrapper.update().state().dropdownOptions.find(option => option.value === 'batch_size')).toEqual(undefined);
      expect(wrapper.update().state().columnWidths.batch_size).toEqual(undefined);
    });

    it('for addition of columns', async () => {
      customColumnsResponse.push({_id: '5c16ebd6bea682411d7c0410', name: 'sample', config_path: 'config.train.sample'});
      const {dropdownOptions, columnOrder, columnWidths} = wrapper.state();
      wrapper.instance().loadData();

      await initialRequestResponse();

      expect(wrapper.update().state().dropdownOptions).toHaveLength(dropdownOptions.length + 1);
      expect(wrapper.update().state().columnOrder).toHaveLength(columnOrder.length + 1);
      expect(Object.keys(wrapper.update().state().columnWidths)).toHaveLength(Object.keys(columnWidths).length + 1);
      expect(wrapper.update().state().columnOrder).toContain('sample');
      expect(wrapper.update().state().dropdownOptions.some(option => option.value === 'sample')).toBeTruthy();
      expect(wrapper.update().state().columnWidths.sample).toEqual(DEFAULT_COLUMN_WIDTH);
    });
  });

  it('should handle newColumnAddition', async () => {
    await initialRequestResponse();
    customColumnsResponse.push({_id: '5c16ebd6bea682411d7c0410', name: 'sample', config_path: 'config.train.sample'});
    const {dropdownOptions, columnOrder, columnWidths} = wrapper.state();
    wrapper.instance()._handleNewColumnAddition();

    mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
    mockAxios.mockResponse({status: 200, data: customColumnsResponse});

    await tick();

    expect(wrapper.update().state().dropdownOptions).toHaveLength(dropdownOptions.length + 1);
    expect(wrapper.update().state().columnOrder).toHaveLength(columnOrder.length + 1);
    expect(Object.keys(wrapper.update().state().columnWidths)).toHaveLength(Object.keys(columnWidths).length + 1);
    expect(wrapper.update().state().columnOrder).toContain('sample');
    expect(wrapper.update().state().dropdownOptions.some(option => option.value === 'sample')).toBeTruthy();
    expect(wrapper.update().state().columnWidths.sample).toEqual(DEFAULT_COLUMN_WIDTH);
  });

  describe('_getColumnValueOptions', () => {
    const getAPIArguments = (column, input) => {
      return ['api/v1/Runs', {
        params: {
          distinct: column,
          query: JSON.stringify({
            [column]: {
              $regex: `^(?i)(${input})`
            }
          })
        }
      }];
    };

    beforeEach(async () => {
      await initialRequestResponse();
      mockAxios.reset();
    });
    describe('should load options', () => {
      it('without input value', async () => {
        wrapper.setState({
          filterColumnName: 'hostname'
        });
        wrapper.instance()._getColumnValueOptions('');
        expect(mockAxios.get.mock.calls).toHaveLength(1);
        expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments('hostname', ''));
      });
      it('with input value', async () => {
        wrapper.setState({
          filterColumnName: 'hostname'
        });
        wrapper.instance()._getColumnValueOptions('abc');
        expect(mockAxios.get.mock.calls).toHaveLength(1);
        expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments('hostname', 'abc'));
      });
      it('for config.tags', async () => {
        wrapper.setState({
          filterColumnName: 'config.tags'
        });
        wrapper.instance()._getColumnValueOptions('');
        expect(mockAxios.get.mock.calls).toHaveLength(1);
        expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments('config.tags', ''));
        mockAxios.mockResponse({status: 200, data: []});
        expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments('omniboard.tags', ''));
      });
      it('for omniboard.tags', async () => {
        wrapper.setState({
          filterColumnName: 'omniboard.tags'
        });
        wrapper.instance()._getColumnValueOptions('');
        expect(mockAxios.get.mock.calls).toHaveLength(1);
        expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments('omniboard.tags', ''));
        mockAxios.mockResponse({status: 200, data: ['test']});
        expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments('config.tags', ''));
        mockAxios.mockResponse({status: 200, data: ['test_1', 'test']});
        expect(wrapper.update().state().currentColumnValueOptions).toHaveLength(2);
        expect(wrapper.update().state().currentColumnValueOptions.map(o => o.value)).toEqual(['test', 'test_1']);
      });
    });
    it('should not load options', async () => {
      wrapper.setState({
        filterColumnName: '_id'
      });
      wrapper.instance()._getColumnValueOptions('');
      expect(mockAxios.get.mock.calls).toHaveLength(0);
    });
  });

  it('should unmount', () => {
    wrapper.unmount();
  });
});
