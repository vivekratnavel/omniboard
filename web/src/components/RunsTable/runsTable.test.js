import React from 'react';
import RunsTable, { FILTER_OPERATOR_LABELS } from './runsTable';
import mockAxios from 'jest-mock-axios';
import { parseServerError } from '../Helpers/utils';
import { STATUS, PROBABLY_DEAD_TIMEOUT } from '../../constants/status.constants';
import { toast } from "react-toastify";
import { LocalStorageMock } from "../../../config/jest/localStorageMock";

describe('RunsTable', () => {
  let wrapper = null;
  let runsResponse = null;
  const tagsResponse = ["test"];
  const columnsResponse = [{"_id":"5b7ef4714232e2d5bec00e2f","name":"pretrain_loss_min","metric_name":"pretrain.train.loss","extrema":"min","__v":0}];
  const RealDate = Date;
  const constantDate = new Date(2018);
  toast.error = jest.fn();

  beforeEach(() => {
    wrapper = mount(
      <RunsTable/>
    );
    // runsTable deletes certain keys in this data and it produces unexpected results
    // That's why assigning data everytime in "beforeEach" block
    runsResponse = [{"_id":10,"heartbeat":"2017-11-27T09:32:23.011Z","experiment":{"dependencies":["sacred==0.7.2"],"mainfile":"train.py","name":"train","sources":[["config.py","5a1bd242ca100c1a210b0d3a"],["data.py","5a1bd242ca100c1a210b0d3c"]],"base_dir":"/home/src","repositories":[{"dirty":false,"commit":"1","url":"git@gitlab.com/hhh.git"}]},"command":"main","artifacts":[],"host":{"gpus":{"gpus":[{"model":"GeForce GTX","persistence_mode":false,"total_memory":11172}],"driver_version":"384.90"},"python_version":"3.5.3","os":["Linux","Linux-4.4.0-98-generic-x86_64-with-debian-stretch-sid"],"ENV":{},"hostname":"nyabuntu","cpu":"Intel(R) Core(TM) i7-6850K CPU @ 3.60GHz"},"stop_time":"2017-11-27T09:32:23.013Z","config":{"optimizer_name":"SGD","weight_decay":0.0001,"random_flip":true},"result":null,"start_time":"2017-11-27T09:30:27.500Z","resources":[],"format":"MongoObserver-0.7.0","status":"INTERRUPTED","metrics":[]},{"_id":11,"config":{"debug":false},"artifacts":[],"resources":[],"host":{"hostname":"nyabuntu","ENV":{},"cpu":"Intel(R) Core(TM) i7-6850K CPU @ 3.60GHz","python_version":"3.5.3","os":["Linux","Linux-4.4.0-98-generic-x86_64-with-debian-stretch-sid"],"gpus":{"driver_version":"384.90","gpus":[{"total_memory":11172,"persistence_mode":false,"model":"GeForce GTX"}]}},"heartbeat":"2017-11-27T09:33:55.210Z","result":null,"experiment":{"mainfile":"train.py","repositories":[{"url":"git@gitlab.com/hhh.git","commit":"2","dirty":false}],"dependencies":["numpy==1.12.1"],"base_dir":"/home/src","sources":[["config.py","5a1bd242ca100c1a210b0d3a"]],"name":"train_mvcnn"},"format":"MongoObserver-0.7.0","command":"main","start_time":"2017-11-27T09:33:54.515Z","stop_time":"2017-11-27T09:33:55.212Z","status":"INTERRUPTED","metrics":[]}];
    global.Date = class extends RealDate {
      constructor(dateString) {
        super();
        return dateString ? new RealDate(dateString) : constantDate;
      }
    };
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    global.Date = RealDate;
    // reset localStorage
    /* eslint-disable no-global-assign */
    localStorage = new LocalStorageMock;
  });

  it('should render', async () => {
    expect(wrapper.state().isTableLoading).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: columnsResponse});
    await tick();

    expect(wrapper.state().isTableLoading).toBeFalsy();
    expect(wrapper.update()).toMatchSnapshot();
  });

  it('should open add remove metric columns modal', () => {
    wrapper.find('#add_remove_metric_columns').at(1).simulate('click');

    expect(wrapper.state().showMetricColumnModal).toBeTruthy();
    wrapper.find('[test-attr="close-btn"]').at(1).simulate('click');

    expect(wrapper.state().showMetricColumnModal).toBeFalsy();
  });

  describe('should load data', async () => {
    const getAPIArguments = (queryString) => {
      return ['/api/v1/Runs', {
        params: {
          select: '_id,heartbeat,experiment,command,artifacts,host,stop_time,config,' +
            'result,start_time,resources,format,status,omniboard,metrics',
          sort: '-_id',
          query: queryString,
          populate: 'metrics'
        }
      }]
    };
    it('with status filter query', () => {
      let queryString = {};

      expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments(queryString));
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => ['running']
        }
      };
      queryString = JSON.stringify({'$and': [{'$or': [{'status': 'running'}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments(queryString));
    });

    it('with status filter as running', () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => [STATUS.RUNNING]
        }
      };
      const heartbeatTimeout = constantDate - PROBABLY_DEAD_TIMEOUT;
      const queryString = JSON.stringify({'$and': [{'$or': [{'$and': [{'status': STATUS.RUNNING}, {'heartbeat': `>${heartbeatTimeout}`}]}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments(queryString));
    });

    it('with status filter as probably_dead', () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => [STATUS.PROBABLY_DEAD]
        }
      };
      const heartbeatTimeout = constantDate - PROBABLY_DEAD_TIMEOUT;
      const queryString = JSON.stringify({'$and': [{'$or': [{'$and': [{'status': STATUS.RUNNING}, {'heartbeat': `<${heartbeatTimeout}`}]}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      expect(mockAxios.get.mock.calls[0]).toEqual(getAPIArguments(queryString));
    });

    it('the second time when other states are retrieved from local storage', async () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      wrapper.instance().loadData();
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      await tick();

      expect(wrapper.state().isTableLoading).toBeFalsy();
    })
  });

  describe('should handle errors correctly', () => {
    it('for error in initial load', async () => {
      const errResponse = {status: 500, message:'unknown error'};
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockError(errResponse);
      await tick();

      expect(wrapper.state().isError).toBeTruthy();
      expect(wrapper.state().errorMessage).toEqual(parseServerError(errResponse));
    });
  });

  it('should expand row correctly', async () => {
    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: columnsResponse});
    await tick();
    wrapper.update().find('[test-attr="cell-row_expander-0"]').simulate('click');

    expect(wrapper.state().expandedRows).toContain(0);
    expect(wrapper.state().scrollToRow).toEqual(0);
    // Clicking on an expanded row should collapse it
    wrapper.find('[test-attr="cell-row_expander-0"]').simulate('click');

    expect(wrapper.state().expandedRows.size).toEqual(0);
    expect(wrapper.state().scrollToRow).toBeNull();
  });

  describe('should handle tag change correctly', () => {
    const rowIndex = 0;
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      await tick();
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
      expect(mockAxios.put).toHaveBeenCalledWith('/api/v1/Runs/' + runsResponse[rowIndex]._id, {
        omniboard: {
          tags: ['tag1','tag2']
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
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      await tick();
      wrapper.instance()._handleNotesChange(rowIndex)('name', notes);
    });

    it('for error response', () => {
      const errResponse = {status: 500, message: 'unknown error'};
      mockAxios.mockError(errResponse);

      expect(toast.error).toHaveBeenCalledWith(parseServerError(errResponse));
    });

    it('for success response', () => {
      expect(mockAxios.put).toHaveBeenCalledWith('/api/v1/Runs/' + runsResponse[rowIndex]._id, {
        omniboard: {
          notes
        }
      });
      mockAxios.mockResponse({status: 200});

      expect(wrapper.state().sortedData.getObjectAt(rowIndex).notes).toEqual(notes);
    });
  });

  it('should handle sort change correctly', async () => {
    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: columnsResponse});
    await tick();
    const event = {
      preventDefault: jest.fn()
    };
    wrapper.update().find('[test-attr="header-sort-_id"]').simulate('click', event);

    expect(event.preventDefault).toHaveBeenCalledWith();
    expect(wrapper.state().sort['_id']).toEqual('DESC');
    expect(wrapper.state().sortedData.getObjectAt(0)._id).toEqual(11);
    wrapper.update().find('[test-attr="header-sort-_id"]').simulate('click', event);

    expect(wrapper.state().sort['_id']).toEqual('ASC');
    expect(wrapper.state().sortedData.getObjectAt(0)._id).toEqual(10);
  });

  describe('should handle column show/hide correctly', () => {
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      await tick();
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
      wrapper.instance()._handleDropdownChange({});

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeFalsy();
      expect(wrapper.state().columnOrder).not.toContain('_id');
      expect(wrapper.state().columnOrder).toHaveLength(3);
      expect(wrapper.state().dropdownOptions.find(option => option.value === 'start_time').selected).toBeTruthy();
    });
  });

  describe('should handle column reorder correctly', () => {
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      await tick();
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
    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: columnsResponse});
    await tick();
    wrapper.instance().handleMetricColumnDelete('_id');

    expect(wrapper.state().columnOrder.indexOf('_id')).toEqual(-1);
    expect(wrapper.state().dropdownOptions.indexOf('_id')).toEqual(-1);
    expect(Object.keys(wrapper.state().columnWidths).indexOf('_id')).toEqual(-1);
  });

  describe('should add or remove filters', () => {
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: columnsResponse});
      await tick();
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

    it('should add filter', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: []});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$eq'});
      wrapper.find('[test-attr="filter-column-value"]').at(1).prop('onChange')({value: 'host1'});
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filters.advanced[0].value).toEqual('host1');
      expect(wrapper.state().filters.advanced[0].name).toEqual('host.hostname');
      expect(wrapper.state().filterColumnName).toEqual('');
      expect(wrapper.state().filterColumnOperator).toEqual('$eq');
      expect(wrapper.state().filterColumnValue).toEqual('');
      expect(wrapper.find('.tags-container').find('.item').find('.tag').at(0).text()).toEqual(`Hostname ${FILTER_OPERATOR_LABELS['$eq']} host1`);
    });

    it('should handle add filter errors', async() => {
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

    it('should load value dropdown options', async() => {
      const response = ["host1", "host2"];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      await tick();
      const expectedOptions = response.map(value => { return {label: value, value} });
      const dropdownOptions = wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options;

      expect(dropdownOptions).toEqual(expectedOptions);
    });

    it('should change value dropdown to multiselect', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().isMulti).toBeFalsy();

      mockAxios.mockResponse({status: 200, data: ["host1", "host2"]});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().isMulti).toBeTruthy();
    });

    it('value dropdown should allow multiple values', async() => {
      const response = ["host1", "host2"];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});
      wrapper.update().find('[test-attr="filter-column-value"]').at(1).prop('onChange')([{value: 'host1'}, {value: 'host2'}]);
      const expectedValues = response.map(value => { return {label: value, value} });

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().value).toEqual(expectedValues);
    });

    it('should handle value dropdown options error', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 400});

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options).toHaveLength(0);
    });

    it('should remove a filter', async() => {
      wrapper.setState({
        filterColumnName: '_id',
        filterColumnOperator: '$gt',
        filterColumnValue: '7',
      });
      wrapper.instance()._handleAddFilterClick();
      wrapper.setState({
        filterColumnName: '_id',
        filterColumnOperator: '$lt',
        filterColumnValue: '11',
      });
      wrapper.instance()._handleAddFilterClick();

      expect(wrapper.update().state().filters.advanced).toHaveLength(2);
      expect(wrapper.state().filters.advanced[0].value).toEqual(7);
      wrapper.update().find('.tags-container').find('.item').at(0).find('.is-delete').simulate('click');

      expect(wrapper.update().state().filters.advanced).toHaveLength(1);
      expect(wrapper.state().filters.advanced[0].value).toEqual(11);
    });
  });
});
