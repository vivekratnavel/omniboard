import React, {Component} from 'reactn';
import axios from 'axios';
import Multiselect from 'react-bootstrap-multiselect';
import {Table, Column} from 'fixed-data-table-2';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import {Button, ButtonToolbar, Alert, Glyphicon} from 'react-bootstrap';
import {toast} from 'react-toastify';
import Select from 'react-select';
import AsyncCreatableSelect from 'react-select/lib/AsyncCreatable';
import Async from 'react-select/lib/Async';
import PropTypes from 'prop-types';
import Switch from 'react-switch';
import moment from 'moment';
import classNames from 'classnames';
import * as QueryString from 'query-string';
import ms from 'ms';
import backend, {setDbInfo} from '../Backend/backend';
import {MetricColumnModal} from '../MetricColumnModal/metricColumnModal';
import {DataListWrapper} from '../Helpers/dataListWrapper';
import {EditableCell, SelectCell, ExpandRowCell, TextCell, CollapseCell, HeaderCell,
  SortTypes, StatusCell, IdCell, DateCell, PendingCell, SelectionCell, SelectionHeaderCell} from '../Helpers/cells';
import {DrillDownView} from '../DrillDownView/drillDownView';
import {EXPANDED_ROW_HEIGHT} from '../DrillDownView/drillDownView.scss';
import {headerText, reorderArray, capitalize, parseServerError, arrayDiffColumns, resolveObjectPath} from '../Helpers/utils';
import {STATUS} from '../../appConstants/status.constants';
import {ProgressWrapper} from '../Helpers/hoc';
import {CustomColumnModal} from '../CustomColumnModal/customColumnModal';
import {AUTO_REFRESH_INTERVAL, INITIAL_FETCH_SIZE, ROW_HEIGHT} from '../../appConstants/app.constants';
import {SettingsModal} from '../SettingsModal/settingsModal';
import {CompareRunsModal} from '../CompareRunsModal/compareRunsModal';
import {DeleteRunsConfirmationModal} from '../DeleteRunsConfirmationModal/deleteRunsConfirmationModal';
import {DrillDownRunModal} from '../DrillDownRunModal/drillDownRunModal';

export const DEFAULT_COLUMN_WIDTH = 150;
const DEFAULT_HEADER_HEIGHT = 50;
const DEFAULT_EXPANDED_ROW_HEIGHT = Number(EXPANDED_ROW_HEIGHT);
const TAGS_COLUMN_HEADER = 'tags';
const NOTES_COLUMN_HEADER = 'notes';
const EXPERIMENT_NAME = 'experiment_name';
const ID_COLUMN_KEY = '_id';
const DURATION_COLUMN_KEY = 'duration';
const STATUS_COLUMN_KEY = 'status';
const START_TIME_KEY = 'start_time';
const STOP_TIME_KEY = 'stop_time';
const HEARTBEAT_KEY = 'heartbeat';
const CONFIG_PREFIX = 'c_';
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
    stateFilterKeys: ['dropdownOptions',
      'columnOrder',
      'columnWidths',
      'sort',
      'metricAndCustomColumns',
      'columnNameMap',
      'statusFilterOptions',
      'filters',
      'autoRefresh']
  };

  static propTypes = {
    showCustomColumnModal: PropTypes.bool.isRequired,
    handleCustomColumnModalClose: PropTypes.func.isRequired,
    showSettingsModal: PropTypes.bool.isRequired,
    handleSettingsModalClose: PropTypes.func.isRequired,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired,
    location: PropTypes.shape({
      search: PropTypes.string
    }),
    history: PropTypes.shape({
      push: PropTypes.func
    })
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
      columnOrder: [],
      dropdownOptions: [],
      statusFilterOptions: STATUS_FILTER_OPTIONS,
      isTableLoading: false,
      tableWidth: 1000,
      tableHeight: 600,
      columnWidths: {},
      sort: {},
      isSelectLoading: {},
      isFetchingUpdates: false,
      filters: {
        status: [],
        advanced: []
      },
      tags: [],
      expandedRows: new Set(),
      selectedRows: new Set(),
      selectAll: false,
      selectAllIndeterminate: false,
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
      customColumns: [],
      metricAndCustomColumns: [],
      runsCount: 0,
      newRunsCount: 0,
      newData: null,
      dataVersion: 0,
      isCompareButtonDisabled: true,
      showCompareColumnsModal: false,
      showDrillDownRunModal: false,
      runIdToExpand: null,
      runIdStatus: null,
      isDeleteButtonDisabled: true,
      showDeleteConfirmationModal: false,
      isDeleteInProgress: false,
      deleteProgress: 0,
      rowsToDelete: []
    };
  }

  _getColumnNameMap = (configs, rootName) => {
    return Object.keys(configs).reduce((configMap, conf) => {
      // Remove the config prefix if present in value to get the correct mapping
      const confValue = conf.startsWith(CONFIG_PREFIX) ? conf.slice(CONFIG_PREFIX.length) : conf;

      configMap[conf] = `${rootName}.${confValue}`;
      return configMap;
    }, {});
  };

  _getInitialFetchSize = () => Number(this.global.settings[INITIAL_FETCH_SIZE].value);

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

  _buildRunsQuery = (metricColumnsData, customColumnsData, end = null) => {
    const {filters, dropdownOptions, columnNameMap, sort} = this.state;
    const queryJson = {$and: []};
    const buildQueryFilter = (operator, key) => value => {
      return {[key]: {[operator]: value}};
    };

    // Get default initial fetch count from global settings.
    if (!end) {
      end = this.global.settings[INITIAL_FETCH_SIZE].value;
    }

    let sort_by = '_id'; // Default sort
    let order_by = '-1'; // Default order by DESC

    if (filters && filters.status.length > 0) {
      const statusFilter = filters.status.map(buildQueryFilter('$eq', 'status'));
      queryJson.$and.push({$or: statusFilter});
    }

    // Process advanced filters
    if (filters && filters.advanced.length > 0) {
      filters.advanced.forEach(filter => {
        if (filter.disabled === true) {
          // ignore
        } else if (filter.operator === '$in') {
          const value = filter.value.map(value => {
            // Check if the value is a number or boolean and convert type accordingly
            if (isNaN(value)) {
              // Check if value is boolean
              value = value === 'true' || (value === 'false' ? false : value);
              // Convert to milliseconds for duration
              value = filter.name === 'duration' ? ms(value) : value;
            } else {
              value = Number(value);
            }

            return value;
          });

          let orFilters = value.map(buildQueryFilter('$eq', filter.name));
          if (filter.name === 'config.tags' || filter.name === 'omniboard.tags') {
            const orFilters1 = buildQueryFilter('$in', 'config.tags')(value);
            const orFilters2 = buildQueryFilter('$in', 'omniboard.tags')(value);
            orFilters = [orFilters1, orFilters2];
          }

          queryJson.$and.push({$or: orFilters});
        } else {
          // Check if the value is a number or boolean and convert type accordingly
          let {value} = filter;
          if (isNaN(value)) {
            // Check if value is boolean
            value = value === 'true' || (value === 'false' ? false : value);
            // Convert to milliseconds for duration
            value = filter.name === 'duration' ? ms(value) : value;
          } else {
            value = Number(value);
          }

          if (filter.name === 'status') {
            queryJson.$and.push(buildQueryFilter(filter.operator, filter.name)(value));
          } else if (filter.name === 'config.tags' || filter.name === 'omniboard.tags') {
            queryJson.$and.push({$or: [{'config.tags': {[filter.operator]: filter.value}}, {'omniboard.tags': {[filter.operator]: filter.value}}]});
          } else if (filter.name === 'omniboard.notes') {
            queryJson.$and.push({$or: [{'meta.comment': {[filter.operator]: filter.value}}, {'omniboard.notes': {[filter.operator]: filter.value}}]});
          } else {
            queryJson.$and.push({[filter.name]: {[filter.operator]: value}});
          }
        }
      });
    }

    // Apply sorting
    if (Object.keys(sort).length > 0) {
      sort_by = Object.keys(sort)[0];
      order_by = sort[sort_by] === SortTypes.ASC ? 1 : -1;
      if (sort_by in columnNameMap) {
        sort_by = columnNameMap[sort_by];
      }
    }

    const queryString = queryJson.$and.length > 0 ? JSON.stringify(queryJson) : '{}';
    let select = '';
    // As an optimization, select data that is only required
    // by looking at the selected columns from the dropdown options
    if (dropdownOptions.length > 0) {
      select = dropdownOptions.filter(optionItem => optionItem.selected === true).map(option => {
        return option.value in columnNameMap ? columnNameMap[option.value] : option.value;
      });
      if (select.includes('config.tags') && !select.includes('omniboard.tags')) {
        select.push('omniboard.tags');
      }

      if (!select.includes('config.tags') && select.includes('omniboard.tags')) {
        select.push('config.tags');
      }

      if (!select.includes('meta') && select.includes('omniboard.notes')) {
        select.push('meta.comment');
      }

      // Remove conflicting paths from select to avoid "Invalid project" error from the server.
      // Example of conflicting path: config, config.settings or config.train, config.train.settings
      // It is possible to have conflicting paths in projection with custom columns
      select = select.filter(col => {
        const colPaths = col.split('.');
        if (colPaths.length > 1) {
          // Add to select only if the path is not conflicting with parent path.
          return colPaths.reduce((result, current, index) => {
            // For config.train.settings
            // we look if "config" or "config.train" is already present
            // in the select array.
            if (index < colPaths.length - 1) {
              return result && !select.includes(colPaths.slice(0, index + 1).join('.'));
            }

            return result && true;
          }, true);
        }

        return true;
      }).join(',');
    } else {
      // Load defaults for the first time
      select = '_id,heartbeat,experiment,command,host,stop_time,config,duration,' +
        'result,start_time,resources,format,status,omniboard,metrics,meta';
      if (metricColumnsData.length > 0) {
        const metricColumnNames = metricColumnsData.map(column => column.name);
        select = select + ',' + metricColumnNames.join(',');
      }

      if (customColumnsData.length > 0) {
        // Select those paths that are not already present in the select to avoid two conflicting paths error
        const customColumnPaths = customColumnsData.filter(column => !select.split(',')
          .some(col => col === (column.config_path && column.config_path.split('.')[0])));
        if (customColumnPaths.length > 0) {
          select = select + ',' + customColumnPaths.map(col => col.config_path).join(',');
        }
      }
    }

    return {
      select,
      sort_by,
      order_by,
      query: queryString,
      limit: end
    };
  };

  _parseRunsResponseData = (runsResponseData, customColumnsData) => {
    /* eslint-disable react/no-access-state-in-setstate */
    let columnNameMap = {...this.state.columnNameMap};
    /* eslint-enable react/no-access-state-in-setstate */

    const parsedRuns = runsResponseData.map(data => {
      if ('config' in data) {
        const {config} = data;
        // Add a prefix to config keys to avoid polluting the keys in root namespace
        const prefixedConfig = Object.keys(config).reduce((prevValue, currentValue) => {
          prevValue[`${CONFIG_PREFIX}${currentValue}`] = config[currentValue];
          return prevValue;
        }, {});
        // Expand each key of config column as individual columns
        data = {...data, ...prefixedConfig};
        const configNameMap = this._getColumnNameMap(prefixedConfig, 'config');
        columnNameMap = {...columnNameMap, ...configNameMap};
      }

      // Include custom config columns
      if (customColumnsData.length > 0) {
        const customColumnsObject = {};
        const customColumnNameMap = {};
        customColumnsData.forEach(column => {
          const columnName = column.name;
          const configPath = column.config_path;
          customColumnsObject[columnName] = resolveObjectPath(data, configPath, '');
          customColumnNameMap[columnName] = configPath;
        });
        data = {...data, ...customColumnsObject};
        columnNameMap = {...columnNameMap, ...customColumnNameMap};
      }

      if ('config' in data) {
        delete data.config;
      }

      if ('info' in data) {
        // Info column has information about metric names
        // which is not needed here
        delete data.info;
      }

      if ('experiment' in data) {
        const {experiment} = data;
        delete data.experiment;
        data = {...data, experiment_name: experiment.name};
        columnNameMap = {...columnNameMap, experiment_name: 'experiment.name'};
      }

      if ('host' in data) {
        const {host} = data;
        delete data.host;
        data = {...data, hostname: host.hostname};
        const hostMap = this._getColumnNameMap(host, 'host');
        columnNameMap = {...columnNameMap, ...hostMap};
      }

      // Convert config.tags into array
      const tagsKey = `${CONFIG_PREFIX}tags`;
      if (tagsKey in data) {
        const tags = data[tagsKey];
        if (typeof tags === 'string' && tags.length > 0) {
          data.tags = tags.split(',');
        } else if (Array.isArray(tags)) {
          data.tags = tags;
        }
      }

      // Expand omniboard columns
      if ('omniboard' in data) {
        const {omniboard} = data;
        delete data.omniboard;
        data = {...data, ...omniboard};
      }

      // Add tags and notes to columnNameMap
      const omniboardMap = this._getColumnNameMap({tags: [], notes: ''}, 'omniboard');
      columnNameMap = {...columnNameMap, ...omniboardMap};

      // Add notes from comment if none has been saved in omniboard
      if (!('notes' in data)) {
        if ('meta' in data) {
          const {meta} = data;
          delete data.meta;
          if ('comment' in meta) {
            const {comment} = meta;
            data = {...data, notes: comment};
          }
        }
      }

      // Delete meta if not deleted already
      if ('meta' in data) {
        delete data.meta;
      }

      delete data.metrics;

      return data;
    });

    this.setState({
      columnNameMap
    });

    return parsedRuns;
  };

  _handleNewColumnAddition = () => {
    axios.all([
      backend.get('api/v1/Omniboard.Metric.Columns'),
      backend.get('api/v1/Omniboard.Custom.Columns')
    ]).then(axios.spread((metricColumns, customColumns) => {
      const latestMetricAndCustomColumns = this._getLatestMetricAndCustomColumns(metricColumns.data, customColumns.data);
      this._updateRuns(latestMetricAndCustomColumns);
      this.loadData();
    }));
  };

  _getLatestColumnOrder = runsResponseData => {
    const latestColumnOrder = runsResponseData.reduce((columns, row) => {
      columns = [...columns];
      return new Set([...columns, ...Object.keys(row)]);
    }, new Set());
    if (!latestColumnOrder.has('tags')) {
      latestColumnOrder.add('tags');
    }

    if (!latestColumnOrder.has('notes')) {
      latestColumnOrder.add('notes');
    }

    return [...latestColumnOrder];
  };

  _getLatestMetricAndCustomColumns = (metricColumnsData, customColumnsData) => {
    const metricColumns = metricColumnsData.map(column => {
      return {
        name: column.name,
        value: column.name
      };
    });
    const customColumns = customColumnsData.map(column => {
      return {
        name: column.name,
        value: column.config_path
      };
    });
    return metricColumns.concat(customColumns);
  };

  _updateRuns = latestMetricAndCustomColumns => {
    const {metricAndCustomColumns} = this.state;

    // Handle addition/deletion of metric/custom columns
    let columnsToAdd = arrayDiffColumns(latestMetricAndCustomColumns, metricAndCustomColumns);
    const columnsToDelete = arrayDiffColumns(metricAndCustomColumns, latestMetricAndCustomColumns);

    // Delete first and then add column to handle updates correctly
    // e.g. column name remains the same but only value changes
    if (columnsToDelete.length > 0) {
      columnsToDelete.map(col => col.name).map(this._handleColumnDelete);
    }

    this.setState(prevState => {
      let newColumnOrder = prevState.columnOrder.slice();
      let newDropdownOptions = prevState.dropdownOptions.slice();
      let newColumnWidths = {...prevState.columnWidths};
      let newColumnNameMap = {...prevState.columnNameMap};

      // Avoid adding the same column twice
      columnsToAdd = columnsToAdd.filter(column => !newColumnOrder.includes(column.name));
      if (columnsToAdd.length > 0) {
        newColumnOrder = newColumnOrder.concat(columnsToAdd.map(column => column.name));
        const dropDownOptionsToAdd = columnsToAdd.map(column => this.createDropdownOption(column.name));
        newDropdownOptions = newDropdownOptions.concat(dropDownOptionsToAdd);
        const columnWidthsToAdd = columnsToAdd.reduce((columnWidths, column) => {
          const columnName = column.name;
          return {...columnWidths, [columnName]: DEFAULT_COLUMN_WIDTH};
        }, {});
        const columnNameMapToAdd = columnsToAdd.reduce((columnMap, column) => {
          return {...columnMap, [column.name]: column.value};
        }, {});
        newColumnWidths = {...newColumnWidths, ...columnWidthsToAdd};
        newColumnNameMap = {...newColumnNameMap, ...columnNameMapToAdd};
      }

      return {
        columnOrder: newColumnOrder,
        columnWidths: newColumnWidths,
        dropdownOptions: newDropdownOptions,
        metricAndCustomColumns: latestMetricAndCustomColumns,
        columnNameMap: newColumnNameMap
      };
    });
  };

  _resetSelectedRows = () => {
    this.setState({
      selectedRows: new Set(),
      selectAll: false,
      selectAllIndeterminate: false
    });
  };

  loadData = () => {
    const latestDropdownOptions = [];

    let runQueryParams = {};
    let metricColumnsData = [];
    let customColumnsData = [];
    this.setState({
      isTableLoading: true,
      isError: false
    });

    // First retrieve metric columns and custom config columns to decide which metrics and columns need to be populated.
    axios.all([
      backend.get('api/v1/Omniboard.Metric.Columns'),
      backend.get('api/v1/Omniboard.Custom.Columns')
    ]).then(axios.spread((metricColumns, customColumns) => {
      metricColumnsData = metricColumns.data;
      customColumnsData = customColumns.data;
      runQueryParams = this._buildRunsQuery(metricColumnsData, customColumnsData);
      return Promise.resolve(true);
    })).then(_resolved => {
      // The value of resolved is not used because
      // it breaks all unit tests and makes it impossible to write unit tests.
      axios.all([
        backend.get('api/v1/Runs', {
          params: runQueryParams
        }),
        backend.get('api/v1/Runs', {
          params: {
            distinct: 'omniboard.tags'
          }
        }),
        backend.get('api/v1/Runs/count', {
          params: {
            query: runQueryParams.query
          }
        })
      ]).then(axios.spread((runsResponse, tags, runsCountResponse) => {
        let runsResponseData = runsResponse.data;
        const runsCount = runsCountResponse.data && 'count' in runsCountResponse.data ? runsCountResponse.data.count : 0;
        if (runsResponseData && runsResponseData.length > 0) {
          runsResponseData = this._parseRunsResponseData(runsResponseData, customColumnsData);

          const latestColumnOrder = this._getLatestColumnOrder(runsResponseData);
          const latestMetricAndCustomColumns = this._getLatestMetricAndCustomColumns(metricColumnsData, customColumnsData);

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
                dropdownOptions: latestDropdownOptions,
                metricAndCustomColumns: latestMetricAndCustomColumns
              });
            }

            this.showHideColumnsDomNode.syncData();
          } else {
            this._updateRuns(latestMetricAndCustomColumns);
          }

          this.setState({
            data: runsResponseData,
            sortedData: new DataListWrapper(runsResponseData, runsCount, this._getInitialFetchSize(), this._fetchRunsRange)
          });
        } else {
          // If response is empty, set empty array for table data
          this.setState({
            data: [],
            sortedData: new DataListWrapper()
          });
        }

        this.setState({
          isTableLoading: false,
          tags: tags.data,
          lastUpdateTime: new Date(),
          customColumns: customColumnsData,
          metricColumns: metricColumnsData,
          runsCount
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
    const {metricColumns, customColumns, data, runsCount, sortedData} = this.state;
    const runQueryParams = this._buildRunsQuery(metricColumns);

    this.setState({
      isFetchingUpdates: true
    });

    // Fetch count of runs
    backend.get('api/v1/Runs/count', {
      params: runQueryParams
    }).then(runsCountResponse => {
      const latestRunsCount = runsCountResponse.data && 'count' in runsCountResponse.data ? runsCountResponse.data.count : 0;
      if (latestRunsCount > runsCount) {
        const newRunsCount = Number(latestRunsCount) - Number(runsCount);
        backend.get('api/v1/Runs', {
          params: runQueryParams
        }).then(runsResponse => {
          const newData = this._parseRunsResponseData(runsResponse.data, customColumns);
          this.setState({
            newRunsCount,
            newData,
            lastUpdateTime: new Date(),
            isFetchingUpdates: false
          });
        });
      } else {
        this.setState({
          lastUpdateTime: new Date(),
          isFetchingUpdates: false
        });
      }
    });

    // Find all the runs that are in "RUNNING" status
    const runningExperiments = data.filter(run => run.status === STATUS.RUNNING);
    const runningIds = runningExperiments.map(run => run[ID_COLUMN_KEY]);

    if (runningExperiments.length > 0) {
      // Build query to fetch only runs that are in "RUNNING" status
      const queryJson = {
        $and: [{
          [ID_COLUMN_KEY]: {[OPERATOR.IN]: runningIds}
        }]
      };

      runQueryParams.query = queryJson;

      this.setState({
        isFetchingUpdates: true
      });

      backend.get('api/v1/Runs', {
        params: runQueryParams
      }).then(runsResponse => {
        let runsResponseData = runsResponse.data;

        if (runsResponseData && runsResponseData.length > 0) {
          runsResponseData = this._parseRunsResponseData(runsResponseData, customColumns);
          const dataArray = sortedData.getDataArray();
          runsResponseData.forEach(run => {
            const rowIndex = dataArray.findIndex(data => data._id === run._id);
            if (rowIndex >= 0) {
              sortedData.setObjectAt(rowIndex, {...run});
            }
          });

          this._refreshTableView();
          this.setState({
            data: sortedData.getDataArray()
          });
        }

        this.setState({
          lastUpdateTime: new Date(),
          isFetchingUpdates: false
        });
      });
    }
  };

  _refreshTableView = () => {
    const {dataVersion} = this.state;
    this.setState({
      dataVersion: dataVersion + 1
    });
  };

  updateTags = (id, tagValues, rowIndex) => {
    this.setState(prevState => {
      return {
        isSelectLoading: {...prevState.isSelectLoading, [rowIndex]: true}
      };
    });
    backend.put('api/v1/Runs/' + id, {
      omniboard: {
        tags: tagValues
      }
    }).then(response => {
      if (response.status === 200) {
        const {sortedData, tags, isSelectLoading} = this.state;

        sortedData.setObjectAt(rowIndex, {...sortedData.getObjectAt(rowIndex), tags: tagValues});
        const newTags = tags;
        tagValues.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
        this.setState({
          isSelectLoading: {...isSelectLoading, [rowIndex]: false},
          tags: newTags
        }, this._refreshTableView);
      }
    }).catch(error => {
      this.setState(prevState => {
        return {
          isSelectLoading: {...prevState.isSelectLoading, [rowIndex]: false}
        };
      });
      toast.error(parseServerError(error));
    });
  };

  updateNotes = (id, notes, rowIndex) => {
    backend.put('api/v1/Runs/' + id, {
      omniboard: {
        notes
      }
    }).then(response => {
      if (response.status === 200) {
        const {sortedData} = this.state;
        sortedData.setObjectAt(rowIndex, {...sortedData.getObjectAt(rowIndex), notes});
        this._refreshTableView();
      }
    }).catch(error => {
      toast.error(parseServerError(error));
    });
  };

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

  _handleShowHideColumnsDropdownChange = _e => {
    const selectedKeys = this.showHideColumnsDomNode.$multiselect.val();
    this.setState(({dropdownOptions}) => ({
      dropdownOptions: dropdownOptions.map(option => {
        option.selected = selectedKeys.includes(option.value);
        return option;
      })
    }), () => {
      this._updateColumnOrder();
      // To fetch data for newly selected columns, load data again.
      // Loading data will add new projections in build query phase.
      this.loadData();
    });
  };

  _onColumnReorderEndCallback = event => {
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
      columnWidths: {...columnWidths, [columnKey]: newColumnWidth}
    }));
  };

  _handleColumnHide = columnKey => {
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

  _onSortChange = (columnKey, sortDir, resetExpandedRows = true) => {
    if (resetExpandedRows) {
      // Expanded rows uses rowId to expand a row. Reset the expanded rows state while sorting
      this._resetExpandedRows();
    }

    this.setState({
      sort: {
        [columnKey]: sortDir
      }
    });
    this._resetSelectedRows();
    this.loadData();
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
    setDbInfo(backend, this.props.dbInfo);
    this.resizeTable();
    window.addEventListener('resize', this.resizeTable);
    // Wait for LocalStorageMixin to setState
    // and then fetch data
    setTimeout(this.loadData, 1);
    setTimeout(() => {
      if (this.state.autoRefresh) {
        this._startPolling();
      }
    }, 1);
    this._parseQueryString();
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    if (prevProps.location.search !== this.props.location.search) {
      this._parseQueryString();
    }
  }

  /**
   * Remove event listener
   */
  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeTable);
  }

  _handleTagChange = rowIndex => {
    return values => {
      const {sortedData} = this.state;
      const id = sortedData.getObjectAt(rowIndex)._id;
      const tags = values.map(optionValue => optionValue.value);
      if (id) {
        this.updateTags(id, tags, rowIndex);
      }
    };
  };

  _handleNotesChange = rowIndex => {
    return (name, value) => {
      const {sortedData} = this.state;
      const id = sortedData.getObjectAt(rowIndex)._id;
      if (id) {
        this.updateNotes(id, value, rowIndex);
      }
    };
  };

  _handleCollapseClick = rowIndex => {
    const {expandedRows} = this.state;
    const shallowCopyOfExpandedRows = new Set([...expandedRows]);
    let scrollToRow = rowIndex;
    if (shallowCopyOfExpandedRows.has(rowIndex)) {
      shallowCopyOfExpandedRows.delete(rowIndex);
      scrollToRow = null;
    } else {
      shallowCopyOfExpandedRows.add(rowIndex);
    }

    this.setState({
      scrollToRow,
      expandedRows: shallowCopyOfExpandedRows
    });
  };

  _updateStateForMultiSelectButtons = selectedRows => {
    let isCompareButtonDisabled = null;
    let isDeleteButtonDisabled = null;
    if (selectedRows.size === 0) {
      isCompareButtonDisabled = true;
      isDeleteButtonDisabled = true;
    } else {
      isDeleteButtonDisabled = selectedRows.size < 1;
      // Only enable compare when 2 or more runs are selected
      isCompareButtonDisabled = selectedRows.size < 2;
    }

    this.setState({
      isCompareButtonDisabled,
      isDeleteButtonDisabled
    });
  };

  _selectRows = (rows, checkAll, checkAllIndeterminate) => {
    const selectedRows = new Set(rows);
    let selectAll = null;
    let selectAllIndeterminate = null;

    if (selectedRows.size === 0) {
      selectAll = false;
      selectAllIndeterminate = false;
    } else {
      selectAll = true;
      selectAllIndeterminate = true;
    }

    if (checkAll !== undefined && checkAllIndeterminate !== undefined) {
      selectAll = checkAll === 'true';
      selectAllIndeterminate = checkAllIndeterminate === 'true';
    }

    this.setState({
      selectedRows,
      selectAll,
      selectAllIndeterminate
    }, () => this._updateStateForMultiSelectButtons(selectedRows));
  };

  _parseQueryString = () => {
    const queryString = QueryString.parse(this.props.location.search);
    if (queryString.selectedRows) {
      this._selectRows(JSON.parse(queryString.selectedRows), queryString.selectAll, queryString.selectAllIndeterminate);
    }

    if (queryString.showCompareModal) {
      this.setState({
        showCompareColumnsModal: queryString.showCompareModal === 'true'
      });
    }

    if (queryString.showDrillDownRunModal) {
      this.setState({
        showDrillDownRunModal: queryString.showDrillDownRunModal === 'true'
      });
    }

    if (queryString.runIdToExpand) {
      this.setState({
        runIdToExpand: queryString.runIdToExpand
      });
    }

    if (queryString.runIdStatus) {
      this.setState({
        runIdStatus: queryString.runIdStatus
      });
    }
  };

  /**
   * Updates the query string in URL.
   *
   * @param {object} queries queryString object
   * @private
   */
  _updateQueryString = queries => {
    const queryString = QueryString.parse(this.props.location.search);
    const updatedQueryString = {...queryString, ...queries};
    this.props.history.push('?' + QueryString.stringify(updatedQueryString));
  };

  _handleRowSelectionClick = rowIndex => {
    const {selectedRows} = this.state;
    const shallowCopyOfSelectedRows = new Set([...selectedRows]);

    if (shallowCopyOfSelectedRows.has(rowIndex)) {
      shallowCopyOfSelectedRows.delete(rowIndex);
    } else {
      shallowCopyOfSelectedRows.add(rowIndex);
    }

    this._updateQueryString({selectedRows: JSON.stringify([...shallowCopyOfSelectedRows])});
  };

  _handleSelectAllClick = checkAll => {
    const {data} = this.state;
    let selectedRows = new Set();
    if (checkAll) {
      selectedRows = new Set(data.map((_, i) => i));
    }

    const queryString = {
      selectedRows: JSON.stringify([...selectedRows]),
      selectAll: checkAll,
      selectAllIndeterminate: false
    };
    this._updateQueryString(queryString);
  };

  _subRowHeightGetter = index => {
    return this.state.expandedRows.has(index) ? DEFAULT_EXPANDED_ROW_HEIGHT : 0;
  };

  _getLocalStorageKeyForDrillDown = (dbInfo, runId) => `${dbInfo.key}|DrillDownView|${runId}`;

  _rowExpandedGetter = ({rowIndex, width, height}) => {
    if (!this.state.expandedRows.has(rowIndex)) {
      return null;
    }

    const runId = this.state.sortedData.getObjectAt(rowIndex)[ID_COLUMN_KEY];
    const {status} = this.state.sortedData.getObjectAt(rowIndex);
    const {dbInfo} = this.props;

    // Local storage key is used for synchronizing state of each drilldown view with local storage
    const localStorageKey = this._getLocalStorageKeyForDrillDown(dbInfo, runId);
    return (
      <DrillDownView showHeader width={width} height={height} runId={runId} status={status} dbInfo={dbInfo} localStorageKey={localStorageKey} handleExpandViewClick={this._handleDrillDownRunExpandClick}/>
    );
  };

  getCell(columnKey, rowData) {
    const {tags, isSelectLoading, dataVersion} = this.state;
    let cell = (
      <PendingCell data={rowData} dataVersion={dataVersion}>
        <TextCell/>
      </PendingCell>
    );
    if (columnKey === TAGS_COLUMN_HEADER) {
      cell = (
        <PendingCell data={rowData} dataVersion={dataVersion} tableDom={this.tableWrapperDomNode}
          isLoading={isSelectLoading}
          tagChangeHandler={this._handleTagChange}
          options={tags}
        >
          <SelectCell/>
        </PendingCell>
      );
    }

    if (columnKey === NOTES_COLUMN_HEADER) {
      cell = (
        <PendingCell data={rowData} dataVersion={dataVersion} changeHandler={this._handleNotesChange}>
          <EditableCell dataVersion={dataVersion}/>
        </PendingCell>
      );
    }

    if (columnKey === EXPERIMENT_NAME) {
      cell = <PendingCell data={rowData} dataVersion={dataVersion}><StatusCell/></PendingCell>;
    }

    if (columnKey === ID_COLUMN_KEY) {
      cell = (
        <PendingCell data={rowData} dataVersion={dataVersion}>
          <IdCell handleDelete={this._handleDeleteRunsClick}/>
        </PendingCell>
      );
    }

    if ([START_TIME_KEY, STOP_TIME_KEY, HEARTBEAT_KEY].includes(columnKey)) {
      cell = (
        <PendingCell data={rowData} dataVersion={dataVersion}>
          <DateCell/>
        </PendingCell>
      );
    }

    return <ExpandRowCell callback={this._handleCollapseClick}>{cell}</ExpandRowCell>;
  }

  _handleStatusFilterChange = _e => {
    const selectedKeys = this.statusFilterDomNode.$multiselect.val();
    const updateFilter = () => {
      const {filters} = this.state;
      // When all the statuses are selected to be shown or none is selected, then reset the filter
      const statusFilter = selectedKeys.length < STATUS_FILTER_OPTIONS.length ? selectedKeys : [];
      const newFilters = {...filters, status: statusFilter};
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

  _handleCompareRunsClick = () => {
    this._updateQueryString({showCompareModal: true});
  };

  _handleDrillDownRunExpandClick = (runId, status) => {
    this._updateQueryString({showDrillDownRunModal: true, runIdToExpand: runId, runIdStatus: status});
  };

  _handleDeleteRunsClick = rowsToDelete => () => {
    this.setState({
      showDeleteConfirmationModal: true,
      rowsToDelete
    });
  };

  _handleAddFilterClick = () => {
    const {filterColumnOperator, filterColumnValue, filterColumnName, filters} = this.state;
    this.setState({
      filterColumnValueError: false,
      filterColumnNameError: false
    });
    if (filterColumnName && filterColumnValue) {
      const advancedFilters = Object.assign([...filters.advanced]);
      const newFilter = {
        name: filterColumnName,
        operator: filterColumnOperator,
        value: filterColumnValue,
        disabled: false
      };
      advancedFilters.push(newFilter);
      this.setState({
        filters: {...filters, advanced: advancedFilters},
        filterColumnName: '',
        filterColumnOperator: '$eq',
        filterColumnValue: ''
      }, () => {
        this.resizeTable();
        this.loadData();
      });
    } else if (filterColumnValue || !filterColumnName) {
      // FilterColumnName is empty or undefined.
      this.setState({
        filterColumnNameError: true
      });
    } else {
      // FilterColumnValue is empty or undefined.
      this.setState({
        filterColumnValueError: true
      });
    }
  };

  _handleMetricColumnModalClose = () => {
    this.setState({
      showMetricColumnModal: false
    });
  };

  _handleCompareColumnsModalClose = () => {
    this._updateQueryString({showCompareModal: false});
  };

  _handleDrillDownRunModalClose = () => {
    this._updateQueryString({showDrillDownRunModal: false});
  }

  _handleDeleteRunsModalClose = () => {
    this.setState({
      showDeleteConfirmationModal: false
    });
  };

  _handleColumnDelete = columnName => {
    const {columnOrder, dropdownOptions, columnWidths, metricAndCustomColumns, columnNameMap} = this.state;
    let newColumnOrder = columnOrder.slice();
    let newDropdownOptions = dropdownOptions.slice();
    let newMetricAndCustomColumns = metricAndCustomColumns.slice();
    const newColumnWidths = {...columnWidths};
    const newColumnNameMap = {...columnNameMap};
    if (columnName) {
      newColumnOrder = newColumnOrder.filter(column => column !== columnName);
      newDropdownOptions = newDropdownOptions.filter(option => option.value !== columnName);
      newMetricAndCustomColumns = newMetricAndCustomColumns.filter(column => column.name !== columnName);
      if (columnName in newColumnWidths) {
        delete newColumnWidths[columnName];
      }

      if (columnName in columnNameMap) {
        delete newColumnNameMap[columnName];
      }

      this.setState({
        columnOrder: newColumnOrder,
        dropdownOptions: newDropdownOptions,
        columnWidths: newColumnWidths,
        metricAndCustomColumns: newMetricAndCustomColumns,
        columnNameMap: newColumnNameMap
      });
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

  _handleFilterColumnValueChange = value => {
    // Value will be array for multi select
    const resultantValue = Array.isArray(value) ? value.map(val => val.value) : value.value;
    this.setState({
      filterColumnValue: resultantValue
    });
  };

  _getColumnNameOptions = () => {
    const {dropdownOptions, columnNameMap} = this.state;
    return dropdownOptions.reduce((options, option) => {
      const newValue = option.value in columnNameMap ? columnNameMap[option.value] : option.value;
      options.push({...option, value: newValue});
      return options;
    }, []);
  };

  _getColumnValueOptions = inputValue => {
    const {filterColumnName} = this.state;
    // Construct case-insensitive regex
    const regex = `^(?i)(${inputValue})`;
    return new Promise(resolve => {
      // Get suggestions for columns of types other than Date or Number
      // Since Date type Number type doesn't support regex
      if (filterColumnName.length > 0 && ![ID_COLUMN_KEY, START_TIME_KEY, STOP_TIME_KEY, HEARTBEAT_KEY, DURATION_COLUMN_KEY, STATUS_COLUMN_KEY].includes(filterColumnName)) {
        const operator = inputValue && !isNaN(inputValue) ? '$eq' : '$regex';
        const value = inputValue && !isNaN(inputValue) ? inputValue : regex;
        const queryJson = {[filterColumnName]: {[operator]: value}};
        // Fetch autocomplete suggestions
        backend.get('api/v1/Runs', {
          params: {
            distinct: filterColumnName,
            query: JSON.stringify(queryJson)
          }
        }).then(response => {
          const formatSuggestions = suggestions => {
            const options = suggestions.reduce((result, current) => {
              if (typeof current !== 'object' && current) {
                result.push({label: current.toString(), value: current.toString()});
              }

              return result;
            }, []);

            this.setState({
              currentColumnValueOptions: options
            });
            resolve(options);
          };

          if (response.status === 200) {
            if (filterColumnName === 'config.tags' || filterColumnName === 'omniboard.tags') {
              const additionalColumn = filterColumnName === 'config.tags' ? 'omniboard.tags' : 'config.tags';
              const query = {[additionalColumn]: {[operator]: value}};
              backend.get('api/v1/Runs', {
                params: {
                  distinct: additionalColumn,
                  query: JSON.stringify(query)
                }
              }).then(additionalResponse => {
                formatSuggestions([...new Set(response.data.concat(additionalResponse.data))]);
              });
            } else {
              formatSuggestions(response.data);
            }
          } else {
            resolve([]);
          }
        });
      } else if (filterColumnName === DURATION_COLUMN_KEY) {
        // Suggest duration options.
        const options = ['30s', '1m', '5m', '10m', '30m', '1h', '2h'].map(key => {
          return {
            label: key,
            value: key
          };
        });
        resolve(options);
      } else if (filterColumnName === STATUS_COLUMN_KEY) {
        // Include all the status options
        const options = [];
        Object.keys(STATUS).forEach(statusKey => {
          options.push({label: STATUS[statusKey], value: STATUS[statusKey]});
        });
        resolve(options);
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
          filters: {...filters, advanced: advancedFilters}
        }, this.loadData);
      }
    };
  };

  _handleDisableFilter = filter => {
    return () => {
      const {filters} = this.state;
      if ('name' in filter && 'operator' in filter && 'value' in filter) {
        const advancedFilters = filters.advanced.reduce((advFilters, advFilter) => {
          if (advFilter.name !== filter.name || advFilter.operator !== filter.operator ||
            JSON.stringify(advFilter.value) !== JSON.stringify(filter.value)) {
            advFilters.push(advFilter);
          } else {
            advFilter.disabled = advFilter.disabled === false;
            advFilters.push(advFilter);
          }

          return advFilters;
        }, []);
        this.setState({
          filters: {...filters, advanced: advancedFilters}
        }, this.loadData);
      }
    };
  };

  _handlePostDeleteRun = runId => {
    const {sortedData, runsCount} = this.state;
    const data = sortedData.getDataArray();
    const index = data.findIndex(item => item._id === runId);
    if (index > -1) {
      // Remove element at index
      data.splice(index, 1);
      const newRunsCount = runsCount - 1;
      const newData = new DataListWrapper(data, newRunsCount, this._getInitialFetchSize, this._fetchRunsRange);
      // Reset expanded rows
      this._resetExpandedRows();
      this._resetSelectedRows();
      this.setState({
        data,
        sortedData: newData,
        runsCount: newRunsCount
      });
    }
  };

  _handleDeleteRuns = experimentIds => e => {
    e.stopPropagation();

    const buildChunksQuery = chunksQuery => {
      return backend.delete('api/v1/Fs.chunks/', {
        params: {
          query: JSON.stringify({
            $or: chunksQuery
          })
        }
      });
    };

    const buildFilesQuery = filesQuery => {
      return backend.delete('api/v1/Fs.files/', {
        params: {
          query: JSON.stringify({
            $or: filesQuery
          })
        }
      });
    };

    if (experimentIds && experimentIds.length > 0) {
      this.setState({
        isDeleteInProgress: true
      });
      let deletedCount = 0;
      const totalCount = experimentIds.length;
      experimentIds.forEach(experimentId => {
        if (experimentId && !isNaN(experimentId)) {
          axios.all([
            backend.get('api/v1/Runs/' + experimentId, {
              params: {
                select: 'artifacts,experiment.sources'
              }
            }),
            backend.get('api/v1/SourceFilesCount/' + experimentId)
          ]).then(axios.spread(async (runsResponse, sourceFilesCountResponse) => {
            runsResponse = runsResponse.data;
            sourceFilesCountResponse = sourceFilesCountResponse.data;
            const deleteApis = [];

            // Since deletes are idempotent, delete all metric rows
            // from metrics collection associated with the given run id
            // without checking if metric rows are present or not.
            deleteApis.push(
              backend.delete('api/v1/Metrics/', {
                params: {
                  query: JSON.stringify({
                    run_id: experimentId
                  })
                }
              }));

            // Delete all artifacts associated with the run id.
            if (runsResponse.artifacts && runsResponse.artifacts.length > 0) {
              const chunksQuery = runsResponse.artifacts.map(file => {
                return {files_id: file.file_id};
              });
              const filesQuery = runsResponse.artifacts.map(file => {
                return {_id: file.file_id};
              });
              deleteApis.push(buildChunksQuery(chunksQuery));
              deleteApis.push(buildFilesQuery(filesQuery));
            }

            // Delete all source files associated with run id
            // only if the source file is not being used by any other run.
            if (sourceFilesCountResponse && sourceFilesCountResponse.length > 0) {
              // Filter files that have count as 1.
              // i.e The source file is not being used by any other run.
              const sourceFilesToDelete = sourceFilesCountResponse.filter(item => item.count === 1);
              if (sourceFilesToDelete.length > 0) {
                const chunksQuery = sourceFilesToDelete.map(file => {
                  return {files_id: file._id};
                });
                const filesQuery = sourceFilesToDelete.map(file => {
                  return {_id: file._id};
                });
                deleteApis.push(buildChunksQuery(chunksQuery));
                deleteApis.push(buildFilesQuery(filesQuery));
              }
            }

            // Delete run.
            deleteApis.push(
              backend.delete('api/v1/Runs/' + experimentId)
            );

            await axios.all(deleteApis).then(axios.spread((...deleteResponses) => {
              if (deleteResponses.every(response => response.status === 204)) {
                // Call callback function to update rows in the table
                this._handlePostDeleteRun(experimentId);
                toast.success(`Experiment run ${experimentId} was deleted successfully!`, {autoClose: 5000});
              } else {
                toast.error('An unknown error occurred!', {autoClose: 5000});
              }
            })).catch(error => {
              toast.error(parseServerError(error), {autoClose: 5000});
            });
          })).catch(error => {
            toast.error(parseServerError(error), {autoClose: 5000});
          });
        }
        // Update delete progress

        deletedCount++;
        const progress = Math.ceil(deletedCount / totalCount * 100);
        this.setState({
          deleteProgress: progress
        });
      });

      this.setState({
        isDeleteInProgress: false,
        showDeleteConfirmationModal: false,
        deleteProgress: 0
      });
    }
  };

  _handleLoadNewRuns = () => {
    const {newData, newRunsCount, runsCount} = this.state;
    const totalRunsCount = newRunsCount + runsCount;
    if (newData && newData.length > 0) {
      const sortedData = new DataListWrapper(newData, totalRunsCount, this._getInitialFetchSize(), this._fetchRunsRange);
      this._resetSelectedRows();
      this.setState({
        runsCount: totalRunsCount,
        data: newData,
        sortedData,
        newRunsCount: 0,
        newData: null
      }, this._refreshTableView);
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

  /**
   * Function to fetch runs till the given limit.
   * @param {number} end End limit to fetch runs collection
   * @private
   * @returns {Promise} Promise
   */
  _fetchRunsRange = end => {
    const {metricColumns, dataVersion, customColumns} = this.state;
    const runQueryParams = this._buildRunsQuery(metricColumns, customColumns, end);

    return new Promise((resolve, reject) => {
      axios.all([
        backend.get('api/v1/Runs', {
          params: runQueryParams
        }),
        backend.get('api/v1/Runs/count', {
          params: {
            query: runQueryParams.query
          }
        })
      ]).then(axios.spread((runsResponse, runsCountResponse) => {
        const runsResponseData = this._parseRunsResponseData(runsResponse.data, customColumns);
        const count = runsCountResponse.data && 'count' in runsCountResponse.data ? runsCountResponse.data.count : 0;

        this.setState({
          data: runsResponseData,
          dataVersion: dataVersion + 1,
          runsCount: count
        });
        resolve({data: runsResponseData, count});
      }))
        .catch(error => reject(error));
    });
  };

  render() {
    const {sortedData, sort, columnOrder, expandedRows, scrollToRow, dropdownOptions, tableWidth, tableHeight,
      columnWidths, statusFilterOptions, showMetricColumnModal, isError, filterColumnValueError, filterColumnNameError,
      errorMessage, isTableLoading, filterColumnName, filterColumnOperator, filterColumnValue, filterValueAsyncValueOptionsKey,
      filters, currentColumnValueOptions, columnNameMap, filterOperatorAsyncValueOptionsKey, autoRefresh,
      lastUpdateTime, isFetchingUpdates, runsCount, dataVersion, newRunsCount, selectedRows, selectAll,
      selectAllIndeterminate, isCompareButtonDisabled, showCompareColumnsModal, rowsToDelete,
      isDeleteButtonDisabled, showDeleteConfirmationModal, isDeleteInProgress, deleteProgress,
      showDrillDownRunModal, runIdToExpand, runIdStatus} = this.state;
    const {showCustomColumnModal, handleCustomColumnModalClose, showSettingsModal, handleSettingsModalClose, dbInfo} = this.props;
    const rowHeight = Number(this.global.settings[ROW_HEIGHT].value);
    if (sortedData && sortedData.getSize()) {
      sortedData.data = sortedData.getDataArray().map(row => {
        return Object.keys(row).map(key => {
          let value = '';
          // Value of row[key] could be false when type is boolean
          if (row[key] || typeof row[key] === 'boolean' || typeof row[key] === 'number') {
            if (typeof row[key] === 'object' && key !== TAGS_COLUMN_HEADER) {
              // Convert object to string
              value = JSON.stringify(row[key]);
            } else if (typeof row[key] === 'boolean') {
              // Convert boolean to string
              value = String(row[key]);
            } else {
              value = row[key];
            }
          }

          return {
            [key]: value
          };
        }).reduce((rowValues, value) => {
          return {...rowValues, ...value};
        }, {});
      });
    }

    const compareRuns = sortedData && sortedData.getSize() > 0 ?
      [...selectedRows].reduce((rows, rowIndex) => {
        if (sortedData.getDataArray()[rowIndex]) {
          rows.push(sortedData.getDataArray()[rowIndex]._id);
        }

        return rows;
      }, []) : [];
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
    const countClass = classNames({
      'count-text': true,
      hide: isTableLoading
    });
    const localStorageKey = (runIdToExpand === null) ? null : this._getLocalStorageKeyForDrillDown(dbInfo, runIdToExpand);
    return (
      <div>
        <div className='table-header'>
          <div className='flex-container'>
            <div className='item'>
              <div className='status-filter pull-left'>
                <label className='filter-label'>Status: </label>
                <Multiselect
                  ref={el => this.statusFilterDomNode = el}
                  includeSelectAllOption multiple
                  enableHTML
                  buttonText={(options, _select) => {
                    if (options.length === 0) {
                      return 'None selected';
                    }

                    return `${options.length} selected`;
                  }}
                  selectedClass='status-selected'
                  id='status_filter'
                  maxHeight={300}
                  data={statusFilterOptions}
                  onSelectAll={this._handleStatusFilterChange}
                  onChange={this._handleStatusFilterChange}
                  onDeselectAll={this._handleStatusFilterChange}
                />
              </div>
            </div>
            <div className='item flex-grow'>
              <div className='flex-container tags-container clearfix'>
                {
                  filters.advanced.map((filter, i) => (
                    <div key={i} className='item'>
                      <div className='tags'>
                        <span className={'tag ' + (filter.disabled ? 'filter-disabled' : '')} onClick={this._handleDisableFilter(filter)}>{getFilterNameLabel(filter.name)} {FILTER_OPERATOR_LABELS[filter.operator]} {getFilterValueLabel(filter.value)}</span>
                        <a className='tag is-delete' onClick={this._handleDeleteFilter(filter)}/>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className='flex-container filters'>
                <label className='item filters-label'>Filters: </label>
                <div className='item filters-select-container'>
                  <div className='row'>
                    <div className='col col-xs-5'>
                      <Select
                        test-attr='filter-column-name-dropdown'
                        className={filterColumnNameError ? 'validation-error' : 'filter-name'}
                        placeholder='Column Name'
                        options={filterColumnNameOptions}
                        value={getSelectValue(filterColumnNameOptions, filterColumnName)}
                        clearable={false}
                        onChange={this._handleFilterColumnNameChange}
                      />
                    </div>
                    <div className='col col-xs-2'>
                      <Async
                        key={filterOperatorAsyncValueOptionsKey}
                        defaultOptions
                        test-attr='filter-column-operator-dropdown'
                        placeholder='Operator'
                        loadOptions={this._getColumnOperatorOptions}
                        value={getSelectValue(FILTER_OPERATOR_OPTIONS, filterColumnOperator)}
                        isOptionDisabled={this._isOperatorOptionDisabled}
                        clearable={false}
                        onChange={this._handleFilterOperatorChange}
                      />
                    </div>
                    <div className='col col-xs-5'>
                      <AsyncCreatableSelect
                        key={filterValueAsyncValueOptionsKey}
                        defaultOptions
                        test-attr='filter-column-value'
                        className={filterColumnValueError ? 'validation-error' : 'filter-value'}
                        placeholder='Enter Value...'
                        loadOptions={this._getColumnValueOptions}
                        formatCreateLabel={getCreateLabel}
                        isMulti={filterColumnOperator === '$in'}
                        value={getMultiSelectValue(currentColumnValueOptions, filterColumnValue)}
                        onChange={this._handleFilterColumnValueChange}
                      />
                    </div>
                  </div>
                </div>
                <div className='item'>
                  <Button id='add_filter' onClick={this._handleAddFilterClick}>Add Filter</Button>
                </div>
              </div>
            </div>
            <div className='item'>
              <div className='show-hide-columns pull-right'>
                <Multiselect ref={el => this.showHideColumnsDomNode = el} includeSelectAllOption
                  enableFiltering
                  enableCaseInsensitiveFiltering
                  dropRight
                  multiple
                  buttonText={(_options, _select) => 'Show/Hide Columns'}
                  data={dropdownOptions}
                  maxHeight={300}
                  onChange={this._handleShowHideColumnsDropdownChange}
                  onSelectAll={this._handleShowHideColumnsDropdownChange}
                  onDeselectAll={this._handleShowHideColumnsDropdownChange}
                />
              </div>
              <ButtonToolbar className='pull-right'>
                <div className='add-remove-metric-columns pull-right'>
                  <Button id='add_remove_metric_columns' onClick={this._handleAddRemoveMetricColumnsClick}>+/- Metric Columns</Button>
                </div>
                <div className='compare-delete-runs pull-right'>
                  <Button id='compare_runs'
                    bsStyle='primary'
                    disabled={isCompareButtonDisabled}
                    onClick={this._handleCompareRunsClick}
                  >
                    <Glyphicon glyph='transfer'/> Compare
                  </Button>
                  <Button id='delete_runs'
                    bsStyle='danger'
                    disabled={isDeleteButtonDisabled}
                    onClick={this._handleDeleteRunsClick(compareRuns)}
                  >
                    <Glyphicon glyph='trash'/> Delete
                  </Button>
                </div>
              </ButtonToolbar>
              <div className='clearfix'/>
            </div>
          </div>
        </div>
        <div className='clearfix'>
          <div className='status-bar pull-left'>
            <span className={countClass}>{runsCount} experiments</span>
          </div>
          <div className='status-bar pull-right'>
            <label>
              <span className='label-text'>Auto Refresh</span>
              &nbsp;
              <Switch checked={autoRefresh} width={32}
                height={16} className='switch-container' onChange={this._handleAutoRefreshChange}
                onColor='#33bd33'/>
              &nbsp;
            </label>
            <span>
            &nbsp;
              <Glyphicon glyph='refresh' className={lastUpdateLoaderClass}/>
              &nbsp;
              Last Update:
              <span className='date-text'> {moment(lastUpdateTime).format('MMMM Do, hh:mm:ss A')}</span>
              &nbsp;
            </span>
            &nbsp;
            <Button bsStyle='success' className='reload-button' onClick={this.loadData}>
              <Glyphicon glyph='repeat'/>
              <span className='reload-text'> Reload</span>
            </Button>
          </div>
          {
            newRunsCount > 0 ?
              <div className='new-runs-bar col-xs-3 text-center' onClick={this._handleLoadNewRuns}>
                <span className='glyphicon glyphicon-arrow-up icon'/> {newRunsCount} New Runs
              </div> : null
          }
        </div>
        <div ref={el => this.tableWrapperDomNode = el} className='table-wrapper'>
          {
            isError ?
              <Alert bsStyle='danger'>{errorMessage}</Alert> :
              <ProgressWrapper loading={isTableLoading}>
                <Table
                  ref={el => this.tableDom = el}
                  rowsCount={runsCount}
                  rowHeight={rowHeight}
                  headerHeight={DEFAULT_HEADER_HEIGHT}
                  subRowHeightGetter={this._subRowHeightGetter}
                  rowExpanded={this._rowExpandedGetter}
                  scrollToRow={scrollToRow}
                  width={tableWidth}
                  isColumnReordering={false}
                  isColumnResizing={false}
                  height={tableHeight}
                  onColumnResizeEndCallback={this._onColumnResizeEndCallback}
                  onColumnReorderEndCallback={this._onColumnReorderEndCallback}
                >
                  <Column
                    fixed
                    columnKey='row_selection'
                    cell={<SelectionCell callback={this._handleRowSelectionClick} selectedRows={selectedRows}/>}
                    width={50}
                    header={
                      <SelectionHeaderCell
                        test-attr='header-cell-selectAll'
                        callback={this._handleSelectAllClick}
                        checked={selectAll}
                        indeterminate={selectAllIndeterminate}
                        columnKey='select-all'/>
                    }
                  />
                  <Column
                    fixed
                    columnKey='row_expander'
                    cell={<CollapseCell callback={this._handleCollapseClick} expandedRows={expandedRows}/>}
                    width={30}
                  />
                  {columnOrder.map((columnKey, i) => (
                    <Column
                      key={dataVersion + i}
                      allowCellsRecycling
                      isReorderable
                      isResizable
                      columnKey={columnKey}
                      fixed={isFixed(columnKey)}
                      header={
                        <HeaderCell
                          test-attr={'header-' + columnKey}
                          sortDir={sort[columnKey]}
                          callback={this._handleColumnHide}
                          onSortChangeHandler={this._onSortChange}
                        >
                          {headerText(columnKey)}
                        </HeaderCell>
                      }
                      cell={this.getCell(columnKey, sortedData)}
                      width={columnWidths[columnKey]}
                      flexGrow={1}
                    />
                  ))}
                </Table>
              </ProgressWrapper>
          }
        </div>
        <MetricColumnModal show={showMetricColumnModal} handleClose={this._handleMetricColumnModalClose}
          handleDataUpdate={this._handleNewColumnAddition} handleDelete={this._handleColumnDelete}/>
        <CustomColumnModal shouldShow={showCustomColumnModal} handleClose={handleCustomColumnModalClose}
          handleDataUpdate={this._handleNewColumnAddition} handleDelete={this._handleColumnDelete}/>
        <SettingsModal show={showSettingsModal} handleClose={handleSettingsModalClose}
          handleAutoRefreshUpdate={this._handleAutoRefreshUpdate} handleInitialFetchSizeUpdate={this.loadData}/>
        <CompareRunsModal shouldShow={showCompareColumnsModal} handleClose={this._handleCompareColumnsModalClose}
          runs={compareRuns} dbInfo={dbInfo}/>
        <DrillDownRunModal shouldShow={showDrillDownRunModal} handleClose={this._handleDrillDownRunModalClose}
          runId={runIdToExpand} status={runIdStatus} dbInfo={dbInfo}
          localStorageKey={localStorageKey}
        />
        <DeleteRunsConfirmationModal handleClose={this._handleDeleteRunsModalClose}
          shouldShow={showDeleteConfirmationModal} runs={rowsToDelete} isDeleteInProgress={isDeleteInProgress}
          handleDelete={this._handleDeleteRuns(rowsToDelete)} progressPercent={deleteProgress}/>
      </div>
    );
  }
}

reactMixin(RunsTable.prototype, LocalStorageMixin);
export default RunsTable;
