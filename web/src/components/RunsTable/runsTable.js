import React, { Component } from 'reactn';
import axios from 'axios';
import Multiselect from 'react-bootstrap-multiselect';
import { Table, Column } from 'fixed-data-table-2';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import { Button, ButtonToolbar, Alert, Glyphicon } from 'react-bootstrap';
import { MetricColumnModal } from '../MetricColumnModal/metricColumnModal';
import { DataListWrapper } from '../Helpers/dataListWrapper';
import { EditableCell, SelectCell, ExpandRowCell ,TextCell, CollapseCell, HeaderCell,
  SortTypes, StatusCell, IdCell, DateCell } from '../Helpers/cells';
import { DrillDownView } from '../DrillDownView/drillDownView';
import { EXPANDED_ROW_HEIGHT } from '../DrillDownView/drillDownView.scss';
import { headerText, arrayDiff, reorderArray, capitalize, parseServerError, getRunStatus } from '../Helpers/utils';
import { STATUS, PROBABLY_DEAD_TIMEOUT } from '../../appConstants/status.constants';
import { ProgressWrapper } from '../Helpers/hoc';
import { toast } from 'react-toastify';
import Select  from 'react-select';
import AsyncCreatableSelect from 'react-select/lib/AsyncCreatable';
import Async from 'react-select/lib/Async';
import { ConfigColumnModal } from '../ConfigColumnModal/configColumnModal';
import PropTypes from 'prop-types';
import Switch from 'react-switch';
import moment from 'moment';
import classNames from 'classnames';
import { AUTO_REFRESH_INTERVAL } from "../../appConstants/app.constants";
import {SettingsModal} from "../SettingsModal/settingsModal";

const DEFAULT_COLUMN_WIDTH = 150;
const DEFAULT_HEADER_HEIGHT = 50;
const DEFAULT_ROW_HEIGHT = 70;
const DEFAULT_EXPANDED_ROW_HEIGHT = Number(EXPANDED_ROW_HEIGHT);
const TAGS_COLUMN_HEADER = 'tags';
const NOTES_COLUMN_HEADER = 'notes';
const EXPERIMENT_NAME = 'experiment_name';
const ID_COLUMN_KEY = '_id';
const DURATION_COLUMN_KEY = 'duration';
const START_TIME_KEY = 'start_time';
const STOP_TIME_KEY = 'stop_time';
const HEARTBEAT_KEY = 'heartbeat';
const OPERATOR = {
  EQUALS: '$eq',
  NOT_EQUALS: '$ne',
  LESS_THAN: '$lt',
  GREATER_THAN: '$gt',
  LESS_THAN_EQUALS: '$lte',
  GREATER_THAN_EQUALS: '$gte',
  IN: '$in',
  REGEX: '$regex'
};

function getStatusLabel(label) {
  return `<div class="clearfix">
            <div class="circle ${label} pull-left"></div>
            <div class="status-text pull-left">${capitalize(label)}</div>
          </div>`;
}

const STATUS_FILTER_OPTIONS = [
  {label: getStatusLabel('running'), value: STATUS.RUNNING, selected: true},
  {label: getStatusLabel('completed'), value: STATUS.COMPLETED, selected: true},
  {label: getStatusLabel('failed'), value: STATUS.FAILED, selected: true},
  {label: getStatusLabel('interrupted'), value: STATUS.INTERRUPTED, selected: true},
  {label: getStatusLabel('timeout'), value: STATUS.TIMEOUT, selected: true},
  {label: getStatusLabel('probably_dead'), value: STATUS.PROBABLY_DEAD, selected: true},
  {label: getStatusLabel('queued'), value: STATUS.QUEUED, selected: true}
  ];

const FILTER_OPERATOR_OPTIONS = [
  {label: '==', value: OPERATOR.EQUALS},
  {label: '!=', value: OPERATOR.NOT_EQUALS},
  {label: '<', value: OPERATOR.LESS_THAN},
  {label: '<=', value: OPERATOR.LESS_THAN_EQUALS},
  {label: '>', value: OPERATOR.GREATER_THAN},
  {label: '>=', value: OPERATOR.GREATER_THAN_EQUALS},
  {label: 'in', value: OPERATOR.IN},
  {label: 'regex', value: OPERATOR.REGEX}
  ];

export const FILTER_OPERATOR_LABELS = {
  [OPERATOR.EQUALS]: '==',
  [OPERATOR.NOT_EQUALS]: '!=',
  [OPERATOR.LESS_THAN]: '<',
  [OPERATOR.LESS_THAN_EQUALS]: '<=',
  [OPERATOR.GREATER_THAN]: '>',
  [OPERATOR.GREATER_THAN_EQUALS]: '>=',
  [OPERATOR.IN]: 'in',
  [OPERATOR.REGEX]: 'regex'
};

class RunsTable extends Component {
  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['dropdownOptions', 'columnOrder', 'columnWidths', 'defaultSortIndices', 'sortIndices', 'sort',
      'columnNameMap', 'statusFilterOptions', 'filters', 'autoRefresh']
  };

  static propTypes = {
    showConfigColumnModal: PropTypes.bool.isRequired,
    handleConfigColumnModalClose: PropTypes.func.isRequired,
    showSettingsModal: PropTypes.bool.isRequired,
    handleSettingsModalClose: PropTypes.func.isRequired
  };

  tableWrapperDomNode = null;
  showHideColumnsDomNode = null;
  statusFilterDomNode = null;
  tableDom = null;
  interval = null;

  constructor(props) {
    super(props);
    this.state = {
      data: null,
      sortedData: null,
      defaultSortIndices: [],
      columnOrder: [],
      dropdownOptions: [],
      statusFilterOptions: STATUS_FILTER_OPTIONS,
      isTableLoading: false,
      tableWidth: 1000,
      tableHeight: 600,
      columnWidths: {},
      sort: {},
      sortIndices: [],
      isSelectLoading: {},
      isFetchingUpdates: false,
      filters: {
        status: [],
        advanced: []
      },
      tags: [],
      expandedRows: new Set(),
      scrollToRow: null,
      showMetricColumnModal: false,
      filterColumnName: '',
      filterColumnOperator: '$eq',
      filterColumnValue: '',
      columnNameMap: {},
      filterValueAsyncValueOptionsKey: 'filtervalue-1',
      filterOperatorAsyncValueOptionsKey: 'filteroperator-1',
      filterColumnValueError: false,
      filterColumnNameError: false,
      currentColumnValueOptions: [],
      isError: false,
      errorMessage: '',
      autoRefresh: true,
      lastUpdateTime: new Date(),
      metricColumns: [],
      configColumns: []
    }
  }

  _getColumnNameMap = (configs, rootName) => {
    return Object.keys(configs).reduce( (configMap, conf) => {
      configMap[conf] = `${rootName}.${conf}`;
      return configMap;
    }, {});
  };

  _resolveObjectPath = (object, path, defaultValue) => path
    .split('.')
    .reduce((o, p) => o && o.hasOwnProperty(p) ? o[p] : defaultValue, object);

  _initPolling = () => {
    this.loadPartialUpdates();
    this.interval = setTimeout(this._initPolling, Number(this.global.settings[AUTO_REFRESH_INTERVAL].value) * 1000);
  };

  _startPolling = () => {
    this._stopPolling();
    this.interval = setTimeout(this._initPolling, Number(this.global.settings[AUTO_REFRESH_INTERVAL].value) * 1000);
  };

  _stopPolling = () => {
    clearTimeout(this.interval);
  };

  _handleAutoRefreshChange = checked => {
    if (checked) {
      this._startPolling();
    } else {
      this._stopPolling();
    }
    this.setState({
      autoRefresh: checked
    });
  };

  _buildRunsQuery = (metricColumnsData) => {
    const {filters} = this.state;
    const queryJson = {'$and': []};
    const statusQueryFilter = operator => status => {
      if (status === STATUS.PROBABLY_DEAD || status === STATUS.RUNNING) {
        // Apply condition to filter "probably dead" status
        // "PROBABLY_DEAD" status is given to runs which are running, but the last heartbeat was at-least 120000ms ago
        const heartbeatTimeout = new Date() - PROBABLY_DEAD_TIMEOUT;
        let heartbeat = status === STATUS.PROBABLY_DEAD ? `<${heartbeatTimeout}` : `>${heartbeatTimeout}`;
        if (operator === '$ne') {
          // inverse the operator for '$ne'
          heartbeat = status === STATUS.PROBABLY_DEAD ? `>${heartbeatTimeout}` : `<${heartbeatTimeout}`;
          return {'$or': [{'status': {[operator]: STATUS.RUNNING}}, {heartbeat}]};
        }
        return {'$and': [{'status': STATUS.RUNNING}, {heartbeat}]};
      }
      return {'status': {[operator]: status}};
    };

    if (filters && filters.status.length) {
      const statusFilter = filters.status.map(statusQueryFilter('$eq'));
      queryJson.$and.push({'$or': statusFilter});
    }

    // Process advanced filters
    if (filters && filters.advanced.length) {
      filters.advanced.forEach(filter => {
        if (filter.operator === '$in') {
          const orFilters = filter.name === 'status' ? filter.value.map(statusQueryFilter('$eq')) : [{[filter.name]: filter.value}];
          queryJson.$and.push({'$or': orFilters});
        } else {
          // Check if the value is a number or boolean and convert type accordingly
          let value = filter.value;
          if (isNaN(value)) {
            // check if value is boolean
            value = value === 'true' || (value === 'false' ? false : value);
          } else {
            value = Number(value);
          }
          if (filter.name === 'status') {
            queryJson.$and.push(statusQueryFilter(filter.operator)(value));
          } else {
            queryJson.$and.push({[filter.name]: {[filter.operator]: value}});
          }
        }
      });
    }

    const queryString = queryJson.$and.length ? JSON.stringify(queryJson) : '{}';
    const runQueryParams = {
      select: '_id,heartbeat,experiment,command,host,stop_time,config,' +
        'result,start_time,resources,format,status,omniboard,metrics,meta',
      sort: '-_id',
      query: queryString
    };

    if (metricColumnsData.length) {
      const metricColumnNames = metricColumnsData.map(column => column.metric_name);
      const distinctMetricColumnNames = [...new Set(metricColumnNames)];
      runQueryParams.populate = {
        path: 'metrics',
        match: {
          name: { $in : distinctMetricColumnNames }
        }
      };
    }

    return runQueryParams;
  };

  _parseRunsResponseData = (runsResponseData, configColumnsData, metricColumnsData) => {
    let columnNameMap = {};

    const parsedRuns = runsResponseData.map(data => {
      if ('config' in data) {
        const config = data['config'];
        // Expand each key of config column as individual columns
        delete data['config'];
        data = {...data, ...config};
        const configNameMap = this._getColumnNameMap(config, 'config');
        columnNameMap = {...columnNameMap, ...configNameMap};

        // Include config columns
        if (configColumnsData.length) {
          const configColumnsObject = {};
          const configColumnNameMap = {};
          configColumnsData.forEach(column => {
            const columnName = column.name;
            const configPath = column.config_path;
            configColumnsObject[columnName] = this._resolveObjectPath(config, configPath, '');
            configColumnNameMap[columnName] = `config.${configPath}`;
          });
          data = {...data, ...configColumnsObject};
          columnNameMap = {...columnNameMap, ...configColumnNameMap};
        }
      }

      if ('experiment' in data) {
        const experiment = data['experiment'];
        delete data['experiment'];
        data = {...data, 'experiment_name': experiment['name']};
        columnNameMap = {...columnNameMap, 'experiment_name': 'experiment.name'};
      }

      if ('host' in data) {
        const host = data['host'];
        delete data['host'];
        data = {...data, 'hostname': host['hostname']};
        const hostMap = this._getColumnNameMap(host, 'host');
        columnNameMap = {...columnNameMap, ...hostMap};
      }

      // Add duration column; duration = heartbeat - start_time
      if (HEARTBEAT_KEY in data && data[HEARTBEAT_KEY] && START_TIME_KEY in data)
        data[DURATION_COLUMN_KEY] = Math.abs(new Date(data[HEARTBEAT_KEY]) - new Date(data[START_TIME_KEY]));

      // Determine if a run is probably dead and assign the status accordingly
      if ('status' in data) {
        data['status'] = getRunStatus(data['status'], data[HEARTBEAT_KEY] || data[START_TIME_KEY]);
      }

      // Expand omniboard columns
      if ('omniboard' in data) {
        const omniboard = data['omniboard'];
        delete data['omniboard'];
        data = {...data, ...omniboard};
        const omniboardMap = this._getColumnNameMap(omniboard, 'omniboard');
        columnNameMap = {...columnNameMap, ...omniboardMap};
      }

      // Add notes from comment if none has been saved in omniboard
      if (!('notes' in data)) {
        if ('meta' in data) {
          const meta = data['meta'];
          delete data['meta'];
          if ('comment' in meta) {
            const comment = meta['comment'];
            data = {...data, 'notes': comment}
          }
        }
      }

      // Delete meta if not deleted already
      if ('meta' in data) {
        delete data['meta'];
      }

      // Include metric columns
      if (metricColumnsData.length) {
        const metricColumnsObject = {};
        const metricColumnNameMap = {};
        metricColumnsData.forEach(column => {
          let value = 0;
          const metric = data['metrics'].find(metric => metric.name === column.metric_name);
          if (metric && metric.values) {
            const extrema = column.extrema;
            if (extrema === 'min') {
              value = metric.values.reduce((a, b) => (a < b) ? a : b);
            } else if (extrema === 'max') {
              value = metric.values.reduce((a, b) => (a > b) ? a : b);
            } else if (extrema === 'last') {
              value = metric.values[metric.values.length - 1];
            } else if (extrema === 'average') {
              value = metric.values.reduce((a, b) => a + b, 0) / metric.values.length;
            }
          }
          metricColumnsObject[column.name] = value;
          metricColumnNameMap[column.name] = `omniboard.columns.${column.name}`;
        });
        data = {...data, ...metricColumnsObject};
        columnNameMap = {...columnNameMap, ...metricColumnNameMap};
      }
      return data;
    });

    this.setState({
      columnNameMap
    });

    return parsedRuns;
  };

  _getLatestColumnOrder = (runsResponseData) => {
    let latestColumnOrder = runsResponseData.reduce((columns, row) => {
      columns = Array.from(columns);
      return new Set([...columns, ...Object.keys(row)]);
    }, new Set());
    if (!latestColumnOrder.has('tags')) {
      latestColumnOrder.add('tags');
    }
    if (!latestColumnOrder.has('notes')) {
      latestColumnOrder.add('notes');
    }
    // Remove metrics from it being displayed as a column
    latestColumnOrder.delete('metrics');

    return [...latestColumnOrder];
  };

  _updateRuns = (latestColumnOrder) => {
    const {columnOrder, dropdownOptions, columnWidths} = this.state;

    // Handle addition/deletion of metric/config columns
    const dropdownOptionValues = dropdownOptions.map(option => option.value);
    const columnsToAdd = arrayDiff(latestColumnOrder, dropdownOptionValues);
    const columnsToDelete = arrayDiff(dropdownOptionValues, latestColumnOrder);
    let newColumnOrder = columnOrder.slice();
    let newDropdownOptions = dropdownOptions.slice();
    let newColumnWidths = Object.assign({}, columnWidths);
    if (columnsToAdd.length) {
      newColumnOrder = newColumnOrder.concat(columnsToAdd);
      const dropDownOptionsToAdd = columnsToAdd.map(column => this.createDropdownOption(column));
      newDropdownOptions = newDropdownOptions.concat(dropDownOptionsToAdd);
      const columnWidthsToAdd = columnsToAdd.reduce((columnWidths, column) => {
        return Object.assign({}, columnWidths, {[column]: DEFAULT_COLUMN_WIDTH});
      }, {});
      newColumnWidths = Object.assign({}, newColumnWidths, columnWidthsToAdd);
    }

    this.setState({
      columnOrder: newColumnOrder,
      columnWidths: newColumnWidths,
      dropdownOptions: newDropdownOptions
    });

    if (columnsToDelete.length) {
      columnsToDelete.map(this._handleColumnDelete);
    }
  };

  _getDefaultSortIndices = (runsResponseData) => {
    const _defaultSortIndices = [];
    for (let index = 0; index < runsResponseData.length; index++) {
      _defaultSortIndices.push(index);
    }

    return _defaultSortIndices;
  };

  loadData = () => {
    let latestDropdownOptions = [];

    let runQueryParams = {};
    let metricColumnsData = [];
    this.setState({
      isTableLoading: true,
      isError: false
    });

    // First retrieve metric columns as to decide which metrics need to be populated.
    axios.get('/api/v1/Omniboard.Columns').then(metricColumns => {
      metricColumnsData = metricColumns.data;
      runQueryParams = this._buildRunsQuery(metricColumnsData);

      return Promise.resolve(true);
    }).then(resolved => {
      // The value of resolved is not used because
      // it breaks all unit tests and makes it impossible to write unit tests.
      axios.all([
        axios.get('/api/v1/Runs', {
          params: runQueryParams
        }),
        axios.get('/api/v1/Runs', {
          params: {
            distinct: 'omniboard.tags'
          }
        }),
        axios.get('/api/v1/Omniboard.Config.Columns')
      ]).then(axios.spread((runsResponse, tags, configColumns) => {

        let runsResponseData = runsResponse.data;
        const configColumnsData = configColumns.data;
        if (runsResponseData && runsResponseData.length) {

          runsResponseData = this._parseRunsResponseData(runsResponseData, configColumnsData, metricColumnsData);

          const latestColumnOrder = this._getLatestColumnOrder(runsResponseData);

          // Set columns array and dropdown options only the first time data is fetched
          if (this.state.data === null) {
            reorderArray(latestColumnOrder, 'status', 'tags');
            reorderArray(latestColumnOrder, 'tags', 'notes');
            reorderArray(latestColumnOrder, HEARTBEAT_KEY, 'duration');
            reorderArray(latestColumnOrder, ID_COLUMN_KEY, EXPERIMENT_NAME);
            reorderArray(latestColumnOrder, EXPERIMENT_NAME, 'hostname');
            const columnWidths = {};
            latestColumnOrder.forEach(key => {
              latestDropdownOptions.push(this.createDropdownOption(key));
              let columnWidth = DEFAULT_COLUMN_WIDTH;
              if (key === TAGS_COLUMN_HEADER || key === NOTES_COLUMN_HEADER) {
                columnWidth = 250;
              }
              if (key === '_id') {
                columnWidth = 70;
              }
              columnWidths[key] = columnWidth;
            });
            // Set state only for the first load.
            // Local storage is used to synchronize state for subsequent page reloads
            if (this.state.columnOrder.length === 0) {
              this.setState({
                columnOrder: latestColumnOrder,
                columnWidths,
                dropdownOptions: latestDropdownOptions
              });
            }
            this.showHideColumnsDomNode.syncData();
          } else {
            this._updateRuns(latestColumnOrder);
          }

          const _defaultSortIndices = this._getDefaultSortIndices(runsResponseData);
          this.setState({
            data: runsResponseData,
            defaultSortIndices: _defaultSortIndices
          }, () => {
            // Apply sort if sorting is already enabled
            if (Object.keys(this.state.sort).length) {
              const sortKey = Object.keys(this.state.sort)[0];
              this._onSortChange(sortKey, this.state.sort[sortKey]);
            } else {
              // Default to sort by _id
              this._onSortChange(ID_COLUMN_KEY, SortTypes.DESC);
            }
          });
        } else {
          // If response is empty, set empty array for table data
          this.setState({
            data: [],
            defaultSortIndices: [],
            sortedData: new DataListWrapper()
          });
        }
        this.setState({
          isTableLoading: false,
          tags: tags.data,
          lastUpdateTime: new Date(),
          configColumns: configColumnsData,
          metricColumns: metricColumnsData
        });
      })).catch(error => {
        const errorMessage = parseServerError(error);
        this.setState({
          isTableLoading: false,
          isError: true,
          errorMessage
        });
      });
    }).catch(error => {
      const errorMessage = parseServerError(error);
      this.setState({
        isTableLoading: false,
        isError: true,
        errorMessage
      });
    });
  };

  loadPartialUpdates = () => {
    const {metricColumns, configColumns, data} = this.state;
    const runQueryParams = this._buildRunsQuery(metricColumns);
    let queryString = JSON.parse(runQueryParams.query);

    // Find the maximum run Id
    const maxRunId = data.reduce((acc, current) => Math.max(acc, current._id), 0);

    // Find all the runs that are in "RUNNING" status
    const runningExperiments = data.filter(run => run['status'] === STATUS.RUNNING);
    const runningIds = runningExperiments.map(run => run[ID_COLUMN_KEY]);

    // Build query to fetch only latest runs or runs that are in "RUNNING" status
    const queryJson = {'$and': [{
      '$or': [{
        [ID_COLUMN_KEY]: {[OPERATOR.IN]: runningIds}
      }, {
        [ID_COLUMN_KEY]: {[OPERATOR.GREATER_THAN]: maxRunId}
      }]
    }]};

    if ('$and' in queryString) {
      queryString['$and'].push(queryJson);
    } else {
      queryString = queryJson;
    }

    runQueryParams.query = queryString;

    this.setState({
      isFetchingUpdates: true
    });

    axios.get('/api/v1/Runs', {
      params: runQueryParams
    }).then(runsResponse => {
      let runsResponseData = runsResponse.data;

      if (runsResponseData && runsResponseData.length) {
        const runIds = runsResponseData.map(run => run._id);
        // Filter out runs from old data that overlap with runs in latest response
        const oldData = data.filter(run => !runIds.includes(run._id));
        const latestRuns = runsResponseData.concat(oldData);
        runsResponseData = this._parseRunsResponseData(latestRuns, configColumns, metricColumns);

        const latestColumnOrder = this._getLatestColumnOrder(runsResponseData);

        this._updateRuns(latestColumnOrder);

        const _defaultSortIndices = this._getDefaultSortIndices(runsResponseData);

        this.setState({
          data: runsResponseData,
          defaultSortIndices: _defaultSortIndices
        }, () => {
          // Apply sort if sorting is already enabled
          if (Object.keys(this.state.sort).length) {
            const sortKey = Object.keys(this.state.sort)[0];
            this._onSortChange(sortKey, this.state.sort[sortKey], false);
          }
        });
      }

      this.setState({
        lastUpdateTime: new Date(),
        isFetchingUpdates: false
      });
    });
  };

  updateTags(id, tagValues, rowIndex) {
    const isSelectLoading = Object.assign({}, this.state.isSelectLoading, {[rowIndex]: true});
    this.setState({isSelectLoading});
    axios.put('/api/v1/Runs/' + id, {
      omniboard: {
        tags: tagValues
      }
    }).then(response => {
        if (response.status === 200) {
          const {sortedData, tags, isSelectLoading} = this.state;
          const newData = new DataListWrapper(sortedData.getIndexArray(), sortedData.getDataArray());
          newData.setObjectAt(rowIndex, Object.assign({}, newData.getObjectAt(rowIndex), {tags: tagValues}));
          const newTags = tags;
          tagValues.forEach(tag => {
            if (newTags.indexOf(tag) < 0) {
              newTags.push(tag);
            }
          });
          this.setState({
            isSelectLoading: Object.assign({}, isSelectLoading, {[rowIndex]: false}),
            sortedData: newData,
            tags: newTags
          });
        }
    }).catch(error => {
      this.setState({
        isSelectLoading: Object.assign({}, isSelectLoading, {[rowIndex]: false})
      });
      toast.error(parseServerError(error));
    });
  }

  updateNotes(id, notes, rowIndex) {
    axios.put('/api/v1/Runs/' + id, {
      omniboard: {
        notes: notes
      }
    }).then(response => {
      if (response.status === 200) {
        const {sortedData} = this.state;
        const newData = new DataListWrapper(sortedData.getIndexArray(), sortedData.getDataArray());
        newData.setObjectAt(rowIndex, Object.assign({}, newData.getObjectAt(rowIndex), {notes}));
        this.setState({
          sortedData: newData
        });
      }
    }).catch(error => {
      toast.error(parseServerError(error));
    });
  }

  createDropdownOption = (key, selected = true) => {
    return {
      label: headerText(key),
      value: key,
      selected
    };
  };

  _updateColumnOrder = () => {
    const selectedKeys = this.showHideColumnsDomNode.$multiselect.val();
    this.setState({
      columnOrder: selectedKeys
    });
  };

  _handleDropdownChange = (e) => {
    const selectedKeys = this.showHideColumnsDomNode.$multiselect.val();
    this.setState(({dropdownOptions}) => ({
      dropdownOptions: dropdownOptions.map(option => {
        option.selected = selectedKeys.includes(option.value);
        return option;
      })
    }), this._updateColumnOrder);
  };

  _onColumnReorderEndCallback = (event) => {
    const columnOrderClone = Object.assign([], this.state.columnOrder);
    const dropdownOptionsClone = Object.assign([], this.state.dropdownOptions);
    const columnOrder = columnOrderClone.filter(columnKey => columnKey !== event.reorderColumn);

    // Reorder dropdown options as well, so that showing/hiding any column
    // in the future doesn't impact the column order
    const dropdownOptions = dropdownOptionsClone.filter(option => option.value !== event.reorderColumn);
    const dropdownOptionToReorder = dropdownOptionsClone.find(option => option.value === event.reorderColumn);

    if (event.columnAfter) {
      const columnOrderIndex = columnOrder.indexOf(event.columnAfter);
      const dropdownOptionsIndex = dropdownOptions.map(option => option.value).indexOf(event.columnAfter);
      columnOrder.splice(columnOrderIndex, 0, event.reorderColumn);
      dropdownOptions.splice(dropdownOptionsIndex, 0, dropdownOptionToReorder);
    } else {
      columnOrder.push(event.reorderColumn);
      dropdownOptions.push(dropdownOptionToReorder);
    }
    this.setState({
      columnOrder,
      dropdownOptions
    });
  };

  _onColumnResizeEndCallback = (newColumnWidth, columnKey) => {
    this.setState(({columnWidths}) => ({
      columnWidths: Object.assign({}, columnWidths, {[columnKey]: newColumnWidth})
    }));
  };

  _handleColumnHide = (columnKey) => {
    this.setState(({dropdownOptions}) => ({
      dropdownOptions: dropdownOptions.map(option => {
        if (option.value === columnKey) {
          option.selected = false;
        }
        return option;
      })
    }), () => this._updateColumnOrder());
  };

  _resetExpandedRows = () => {
    this.setState({
      expandedRows: new Set()
    });
  };

  _getSortedData = (sortIndices, data, columnKey, sortDir) => {
    sortIndices.sort((indexA, indexB) => {
      const dataA = data[indexA][columnKey];
      const dataB = data[indexB][columnKey];
      const valueA = columnKey === DURATION_COLUMN_KEY ? Number(dataA) || 0 : dataA;
      const valueB = columnKey === DURATION_COLUMN_KEY ? Number(dataB) || 0 : dataB;
      let sortVal = 0;
      if (valueA > valueB) {
        sortVal = 1;
      }
      if (valueA < valueB) {
        sortVal = -1;
      }
      if (sortVal !== 0 && sortDir === SortTypes.DESC) {
        sortVal = sortVal * -1;
      }
      return sortVal;
    });
    return new DataListWrapper(sortIndices, data);
  };

  _onSortChange = (columnKey, sortDir, resetExpandedRows = true) => {
    const {data, defaultSortIndices} = this.state;
    let sortIndices = defaultSortIndices.slice();
    if (resetExpandedRows) {
      // Expanded rows uses rowId to expand a row. Reset the expanded rows state while sorting
      this._resetExpandedRows();
    }
    if (sortIndices && sortIndices.length) {
      const sortedData = this._getSortedData(sortIndices, data, columnKey, sortDir);
      this.setState({
        sortedData,
        sort: {
          [columnKey]: sortDir,
        },
        sortIndices: sortedData.getIndexArray()
      });
    }
  };

  resizeTable = () => {
    const {tableWidth, tableHeight} = this.state;
    // Set the table width and height to occupy full viewport
    this.setState({
      tableWidth: window.innerWidth ? window.innerWidth : tableWidth,
      tableHeight: window.innerHeight && this.tableWrapperDomNode ? window.innerHeight - this.tableWrapperDomNode.offsetTop : tableHeight
    });
  };

  /**
   * Add event listener
   */
  componentDidMount() {
    this.resizeTable();
    window.addEventListener("resize", this.resizeTable);
    // Wait for LocalStorageMixin to setState
    // and then fetch data
    setTimeout(this.loadData, 1);
    setTimeout(() => {
      if (this.state.autoRefresh) {
        this._startPolling();
      }
    }, 1);
  }

  /**
   * Remove event listener
   */
  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeTable);
  }

  _handleTagChange = (rowIndex) => {
    return (values) => {
      const {sortedData} = this.state;
      const id = sortedData.getObjectAt(rowIndex)['_id'];
      const tags = values.map(optionValue => optionValue.value);
      if (id) {
        this.updateTags(id, tags, rowIndex);
      }
    }
  };

  _handleNotesChange = (rowIndex) => {
    return (name, value) => {
      const {sortedData} = this.state;
      const id = sortedData.getObjectAt(rowIndex)['_id'];
      if (id) {
        this.updateNotes(id, value, rowIndex);
      }
    }
  };

  _handleCollapseClick = (rowIndex) => {
    const {expandedRows} = this.state;
    const shallowCopyOfExpandedRows = new Set([...expandedRows]);
    let scrollToRow = rowIndex;
    if (shallowCopyOfExpandedRows.has(rowIndex)) {
      shallowCopyOfExpandedRows.delete(rowIndex);
      scrollToRow = null
    } else {
      shallowCopyOfExpandedRows.add(rowIndex);
    }

    this.setState({
      scrollToRow: scrollToRow,
      expandedRows: shallowCopyOfExpandedRows
    });
  };

  _subRowHeightGetter = (index) => {
    return this.state.expandedRows.has(index) ? DEFAULT_EXPANDED_ROW_HEIGHT : 0;
  };

  _rowExpandedGetter = ({rowIndex, width, height}) => {
    if (!this.state.expandedRows.has(rowIndex)) {
      return null;
    }
    const runId = this.state.sortedData.getObjectAt(rowIndex)[ID_COLUMN_KEY];
    const status = this.state.sortedData.getObjectAt(rowIndex)['status'];
    // Local storage key is used for synchronizing state of each drilldown view with local storage
    const localStorageKey = `DrillDownView|${runId}`;
    return (
      <DrillDownView width={width} height={height} runId={runId} status={status} localStorageKey={localStorageKey}/>
    );
  };

  getCell(columnKey, rowData) {
    const {tags, isSelectLoading} = this.state;
    let cell = <TextCell data={rowData} />;
    if (columnKey === TAGS_COLUMN_HEADER) {
      cell = <SelectCell
        tableDom={this.tableWrapperDomNode}
        data={rowData}
        isLoading={isSelectLoading}
        tagChangeHandler={this._handleTagChange}
        options={tags}/>;
    }
    if (columnKey === NOTES_COLUMN_HEADER) {
      cell = <EditableCell
        data={rowData}
        changeHandler={this._handleNotesChange}/>;
    }
    if (columnKey === EXPERIMENT_NAME) {
      cell = <StatusCell data={rowData}/>;
    }
    if (columnKey === ID_COLUMN_KEY) {
      cell = <IdCell data={rowData} handleDataUpdate={this._handleDeleteExperimentRun}/>;
    }
    if ([START_TIME_KEY, STOP_TIME_KEY, HEARTBEAT_KEY].includes(columnKey)) {
      cell = <DateCell data={rowData}/>
    }
    return <ExpandRowCell callback={this._handleCollapseClick}>{cell}</ExpandRowCell>;
  }

  _handleStatusFilterChange = (e) => {
    const selectedKeys = this.statusFilterDomNode.$multiselect.val();
    const updateFilter = () => {
      const {filters} = this.state;
      // When all the statuses are selected to be shown or none is selected, then reset the filter
      const statusFilter = selectedKeys.length < STATUS_FILTER_OPTIONS.length ? selectedKeys : [];
      const newFilters = Object.assign({}, filters, {status: statusFilter});
      this.setState({
        filters: newFilters
      }, this.loadData);
    };
    this.setState(({statusFilterOptions}) => ({
      statusFilterOptions: statusFilterOptions.map(option => {
        option.selected = selectedKeys.includes(option.value);
        return option;
      })
    }), updateFilter);
  };

  _handleAddRemoveMetricColumnsClick = () => {
    this.setState({
      showMetricColumnModal: true
    });
  };

  _handleAddFilterClick = () => {
    const { filterColumnOperator, filterColumnValue, filterColumnName, filters } = this.state;
    this.setState({
      filterColumnValueError: false,
      filterColumnNameError: false
    });
    if (!filterColumnName) {
      this.setState({
        filterColumnNameError: true
      });
    } else if (!filterColumnValue) {
      this.setState({
        filterColumnValueError: true
      });
    } else {
      const advancedFilters = Object.assign([...filters.advanced]);
      const newFilter = {
        name: filterColumnName,
        operator: filterColumnOperator,
        value: filterColumnValue
      };
      advancedFilters.push(newFilter);
      this.setState({
        filters: Object.assign({}, filters, {'advanced': advancedFilters}),
        filterColumnName: '',
        filterColumnOperator: '$eq',
        filterColumnValue: ''
      }, this.loadData);
    }
  };

  _handleMetricColumnModalClose = () => {
    this.setState({
      showMetricColumnModal: false
    });
  };

  _handleColumnDelete = (columnName) => {
    const {columnOrder, dropdownOptions, columnWidths} = this.state;
    let newColumnOrder = columnOrder.slice();
    let newDropdownOptions = dropdownOptions.slice();
    let newColumnWidths = Object.assign({}, columnWidths);
    if (columnName) {
      newColumnOrder = newColumnOrder.filter(column => column !== columnName);
      newDropdownOptions = newDropdownOptions.filter(option => option.value !== columnName);
      if (columnName in newColumnWidths) {
        delete newColumnWidths[columnName];
      }
      this.setState({
        columnOrder: newColumnOrder,
        dropdownOptions: newDropdownOptions,
        columnWidths: newColumnWidths
      })
    }
  };

  _updateAsyncKey = keyName => () => {
    // A workaround to loadOptions manually for "Value" dropdown
    // is to change its "key" prop
    const key = this.state[keyName];
    const asyncKeySplit = key.split('-');
    // Increment counter
    asyncKeySplit[1] = Number(asyncKeySplit[1]) + 1;
    this.setState({
      [keyName]: asyncKeySplit.join('-')
    });
  };

  _handleFilterColumnNameChange = ({value}) => {
    this.setState({
      filterColumnName: value
    }, () => {
      this._updateAsyncKey('filterValueAsyncValueOptionsKey')();
      this._updateAsyncKey('filterOperatorAsyncValueOptionsKey')();
    });
  };

  _handleFilterOperatorChange = ({value}) => {
    const {filterColumnOperator, filterColumnValue} = this.state;
    // Reset FilterValue dropdown if there is a change from/to $in
    // Because $in operator renders multi select for FilterValue dropdown
    const newFilterColumnValue = filterColumnOperator === '$in' || value === '$in' ? '' : filterColumnValue;
    this.setState({
      filterColumnOperator: value,
      filterColumnValue: newFilterColumnValue
    });
  };

  _handleFilterColumnValueChange = (value) => {
    // value will be array for multi select
    const resultantValue = Array.isArray(value) ? value.map(val => val.value) : value.value;
    this.setState({
      filterColumnValue: resultantValue
    })
  };

  _getColumnNameOptions = () => {
    const {dropdownOptions, columnNameMap} = this.state;
    return dropdownOptions.reduce((options, option) => {
      // Exclude duration and metric columns from dropdown options
      // since filter cannot be applied directly on those fields
      if (option.value !== DURATION_COLUMN_KEY) {
        const newValue = option.value in columnNameMap ? columnNameMap[option.value] : option.value;
        if (newValue.indexOf('omniboard.columns.') === -1) {
          options.push(Object.assign({}, option, {value: newValue}));
        }
      }
      return options;
    }, []);
  };

  _getColumnValueOptions = inputValue => {
    const {filterColumnName} = this.state;
    // construct case-insensitive regex
    const regex = `^(?i)(${inputValue})`;
    return new Promise(resolve => {
      // Get suggestions for columns of types other than Date or Number
      // Since Date type Number type doesn't support regex
      if (filterColumnName.length && ![ID_COLUMN_KEY, START_TIME_KEY, STOP_TIME_KEY, HEARTBEAT_KEY, DURATION_COLUMN_KEY].includes(filterColumnName)) {
        const operator = inputValue && !isNaN(inputValue) ? "$eq" : "$regex";
        const value = inputValue && !isNaN(inputValue) ? inputValue : regex;
        const queryJson = {[filterColumnName]: { [operator]: value}};
        // Fetch autocomplete suggestions
        axios.get('/api/v1/Runs', {
          params: {
            distinct: filterColumnName,
            query: JSON.stringify(queryJson)
          }
        }).then(response => {
          if (response.status === 200) {
            const options = response.data.reduce( (result, current) => {
              if (typeof current !== "object" && current) {
                result.push({label: current.toString(), value: current.toString()});
              }
              return result;
            }, []);
            // include Probably Dead status for status options
            if (filterColumnName === 'status') {
              options.push({label: STATUS.PROBABLY_DEAD, value: STATUS.PROBABLY_DEAD});
            }
            this.setState({
              currentColumnValueOptions: options
            });
            resolve(options);
          } else {
            resolve([]);
          }
        });
      } else {
        resolve([]);
      }
    });
  };

  _getColumnOperatorOptions = () => {
    return new Promise(resolve => {
      resolve(FILTER_OPERATOR_OPTIONS);
    });
  };

  _handleDeleteFilter = filter => {
    return () => {
      const {filters} = this.state;
      if ('name' in filter && 'operator' in filter && 'value' in filter) {
        const advancedFilters = filters.advanced.reduce((advFilters, advFilter) => {
          if (advFilter.name !== filter.name || advFilter.operator !== filter.operator ||
            JSON.stringify(advFilter.value) !== JSON.stringify(filter.value)) {
            advFilters.push(advFilter);
          }
          return advFilters;
        }, []);
        this.setState({
          filters: Object.assign({}, filters, {'advanced': advancedFilters})
        }, this.loadData);
      }
    }
  };

  _handleDeleteExperimentRun = runId => {
    const {data, sort} = this.state;
    const index = data.findIndex(item => item._id === runId);
    const defaultSortIndices = [];
    if (index > -1) {
      // Remove element at index
      data.splice(index, 1);
      for (let index = 0; index < data.length; index++) {
        defaultSortIndices.push(index);
      }
      // Here assumption is that runs are always sorted
      // And sorting is enabled on one column
      const sortKey = Object.keys(sort)[0];
      const sortedData = this._getSortedData(defaultSortIndices.slice(), data, sortKey, sort[sortKey]);
      this.setState({
        data,
        defaultSortIndices,
        sortedData,
        sortIndices: sortedData.getIndexArray()
      });
    }
  };

  _handleAutoRefreshUpdate = () => {
    const {autoRefresh} = this.state;
    // Restart polling if auto refresh is enabled
    if (autoRefresh) {
      this._startPolling();
    }
  };

  _isOperatorOptionDisabled = option => {
    const {filterColumnName} = this.state;
    if (filterColumnName === 'status') {
      return !(option.value === '$eq' || option.value === '$ne' || option.value === '$in');
    }
    return false;
  };

  render() {
    const { sortedData, sort, columnOrder, expandedRows, scrollToRow, dropdownOptions, tableWidth, tableHeight,
      columnWidths, statusFilterOptions, showMetricColumnModal, isError, filterColumnValueError, filterColumnNameError,
      errorMessage, isTableLoading, filterColumnName, filterColumnOperator, filterColumnValue, filterValueAsyncValueOptionsKey,
      filters, currentColumnValueOptions, columnNameMap, filterOperatorAsyncValueOptionsKey, autoRefresh,
      lastUpdateTime, isFetchingUpdates } = this.state;
    const {showConfigColumnModal, handleConfigColumnModalClose, showSettingsModal, handleSettingsModalClose} = this.props;
    let rowData = new DataListWrapper();
    if (sortedData && sortedData.getSize()) {
      const indexArray = sortedData.getIndexArray();
      const _rowData = sortedData.getDataArray().map( row => {
        return Object.keys(row).map( key => {
          let value = '';
          // value of row[key] could be false when type is boolean
          if (row[key] || typeof row[key] === "boolean") {
            if (typeof row[key] === "object" && key !== TAGS_COLUMN_HEADER) {
              // Convert object to string
              value = JSON.stringify(row[key]);
            } else if (typeof row[key] === "boolean") {
              // Convert boolean to string
              value = row[key] + "";
            } else {
              value = row[key];
            }
          }
          return {
            [key]: value
          }
        }).reduce( (rowValues, value) => {
          return Object.assign({}, rowValues, value);
        }, {});
      });
      rowData = new DataListWrapper(indexArray, _rowData);
    }
    const getSelectValue = (options, value) => {
      const selectValue = options.find(option => option.value === value);
      return selectValue ? selectValue : value ? {label: value, value} : '';
    };
    const getMultiSelectValue = (options, value) => {
      if (Array.isArray(value)) {
        return value.map(val => getSelectValue(options, val));
      }
      return getSelectValue(options, value);
    };
    const getCreateLabel = input => input;
    const getFilterNameLabel = value => {
      const columnName = Object.keys(columnNameMap).find(key => columnNameMap[key] === value) || value;
      return headerText(columnName);
    };
    const getFilterValueLabel = value => Array.isArray(value) ? value.join(',') : value;
    const filterColumnNameOptions = this._getColumnNameOptions();
    const isFixed = columnKey => columnKey === '_id';
    const lastUpdateLoaderClass = classNames({
      'glyphicon-refresh-animate': isFetchingUpdates
    });
    return (
      <div>
        <div className="table-header">
          <div className="flex-container">
            <div className="item">
              <div className="status-filter pull-left">
                <label className="filter-label">Status: </label>
                <Multiselect
                  id={"status_filter"}
                  data={statusFilterOptions} multiple
                  includeSelectAllOption={true}
                  onChange={this._handleStatusFilterChange}
                  onSelectAll={this._handleStatusFilterChange}
                  onDeselectAll={this._handleStatusFilterChange}
                  maxHeight={300}
                  enableHTML={true}
                  selectedClass="status-selected"
                  buttonText={(options, select) => {
                    if (options.length === 0) {
                      return 'None selected';
                    } else {
                      return `${options.length} selected`;
                    }
                  }}
                  ref={el => this.statusFilterDomNode = el}
                />
              </div>
            </div>
            <div className="item">
              <div className="flex-container tags-container clearfix">
                {
                  filters.advanced.map((filter, i) =>
                    <div key={i} className="item">
                      <div className="tags">
                        <span className="tag">{getFilterNameLabel(filter.name)} {FILTER_OPERATOR_LABELS[filter.operator]} {getFilterValueLabel(filter.value)}</span>
                        <a onClick={this._handleDeleteFilter(filter)} className="tag is-delete"/>
                      </div>
                    </div>
                  )
                }
              </div>
              <div className="flex-container filters">
                <label className="item filters-label">Filters: </label>
                <div className="item filters-select-container">
                  <div className="row">
                    <div className="col col-xs-5">
                      <Select
                        test-attr="filter-column-name-dropdown"
                        className={filterColumnNameError ? 'validation-error' : 'filter-name'}
                        placeholder="Column Name"
                        options={filterColumnNameOptions}
                        onChange={this._handleFilterColumnNameChange}
                        value={getSelectValue(filterColumnNameOptions, filterColumnName)}
                        clearable={false}
                      />
                    </div>
                    <div className="col col-xs-2">
                      <Async
                        test-attr="filter-column-operator-dropdown"
                        key={filterOperatorAsyncValueOptionsKey}
                        placeholder="Operator"
                        loadOptions={this._getColumnOperatorOptions}
                        defaultOptions
                        onChange={this._handleFilterOperatorChange}
                        value={getSelectValue(FILTER_OPERATOR_OPTIONS, filterColumnOperator)}
                        isOptionDisabled={this._isOperatorOptionDisabled}
                        clearable={false}
                      />
                    </div>
                    <div className="col col-xs-5">
                      <AsyncCreatableSelect
                        key={filterValueAsyncValueOptionsKey}
                        test-attr="filter-column-value"
                        className={filterColumnValueError ? 'validation-error' : 'filter-value'}
                        placeholder="Enter Value..."
                        loadOptions={this._getColumnValueOptions}
                        formatCreateLabel={getCreateLabel}
                        onChange={this._handleFilterColumnValueChange}
                        defaultOptions
                        isMulti={filterColumnOperator === "$in"}
                        value={getMultiSelectValue(currentColumnValueOptions, filterColumnValue)}
                      />
                    </div>
                  </div>
                </div>
                <div className="item">
                  <Button id={"add_filter"} onClick={this._handleAddFilterClick}>Add Filter</Button>
                </div>
              </div>
            </div>
            <div className="item">
              <div className="show-hide-columns pull-right">
                <Multiselect data={dropdownOptions} multiple
                             includeSelectAllOption={true}
                             maxHeight={300}
                             ref={el => this.showHideColumnsDomNode = el}
                             buttonText={(options, select) => 'Show/Hide Columns'}
                             enableFiltering={true}
                             dropRight={true}
                             enableCaseInsensitiveFiltering={true}
                             onChange={this._handleDropdownChange}
                             onSelectAll={this._handleDropdownChange}
                             onDeselectAll={this._handleDropdownChange}
                />
              </div>
              <ButtonToolbar className="pull-right">
                <div className="add-remove-metric-columns pull-right">
                  <Button id={"add_remove_metric_columns"} onClick={this._handleAddRemoveMetricColumnsClick}>+/- Metric Columns</Button>
                </div>
              </ButtonToolbar>
              <div className="clearfix"/>
            </div>
          </div>
        </div>
        <div className="status-bar pull-right">
          <label>
            <span className="label-text">Auto Refresh</span>
            &nbsp;
            <Switch onChange={this._handleAutoRefreshChange} checked={autoRefresh}
                    width={32} height={16} className="switch-container" onColor="#33bd33"/>
            &nbsp;
          </label>
          <span>
            &nbsp;
            <Glyphicon glyph="refresh" className={lastUpdateLoaderClass}/>
            &nbsp;
            Last Update:
            <span className="date-text"> {moment(lastUpdateTime).format('MMMM Do, hh:mm:ss A')}</span>
            &nbsp;
          </span>
          &nbsp;
          <Button bsStyle="success" className="reload-button" onClick={this.loadData}>
            <Glyphicon glyph="repeat"/>
            <span className="reload-text"> Reload</span>
          </Button>
        </div>
        <div className="table-wrapper" ref={el => this.tableWrapperDomNode = el}>
          {
            isError
            ?
            <Alert bsStyle="danger">{errorMessage}</Alert>
            :
            <ProgressWrapper loading={isTableLoading}>
              <Table
                scrollToRow={scrollToRow}
                ref={el => this.tableDom = el}
                rowHeight={DEFAULT_ROW_HEIGHT}
                headerHeight={DEFAULT_HEADER_HEIGHT}
                subRowHeightGetter={this._subRowHeightGetter}
                rowExpanded={this._rowExpandedGetter}
                rowsCount={rowData.getSize()}
                onColumnReorderEndCallback={this._onColumnReorderEndCallback}
                isColumnReordering={false}
                onColumnResizeEndCallback={this._onColumnResizeEndCallback}
                isColumnResizing={false}
                width={tableWidth}
                height={tableHeight}>
                <Column
                  columnKey={"row_expander"}
                  cell={<CollapseCell callback={this._handleCollapseClick} expandedRows={expandedRows}/>}
                  fixed={true}
                  width={30}
                />
                {columnOrder.map((columnKey, i) =>
                  <Column
                    allowCellsRecycling={true}
                    columnKey={columnKey}
                    key={i}
                    isReorderable={true}
                    fixed={isFixed(columnKey)}
                    header={
                      <HeaderCell
                        test-attr={"header-" + columnKey}
                        onSortChangeHandler={this._onSortChange}
                        sortDir={sort[columnKey]}
                        callback={this._handleColumnHide}>
                        {headerText(columnKey)}
                      </HeaderCell>
                    }
                    cell={this.getCell(columnKey, rowData)}
                    width={columnWidths[columnKey]}
                    flexGrow={1}
                    isResizable={true}
                  />
                )}
              </Table>
            </ProgressWrapper>
          }
        </div>
        <MetricColumnModal show={showMetricColumnModal} handleClose={this._handleMetricColumnModalClose}
                           handleDataUpdate={this.loadData} handleDelete={this._handleColumnDelete}/>
        <ConfigColumnModal show={showConfigColumnModal} handleClose={handleConfigColumnModalClose}
                           handleDataUpdate={this.loadData} handleDelete={this._handleColumnDelete}/>
        <SettingsModal show={showSettingsModal} handleClose={handleSettingsModalClose}
                       handleAutoRefreshUpdate={this._handleAutoRefreshUpdate}/>
      </div>
    );
  }
}

reactMixin(RunsTable.prototype, LocalStorageMixin);
export default RunsTable;
