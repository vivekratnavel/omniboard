/* eslint-disable no-unreachable */
/* eslint-disable no-console */

import React, { Component } from 'react';
import axios from 'axios';
import Multiselect from 'react-bootstrap-multiselect';
import { Table, Column } from 'fixed-data-table-2';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import ms from 'ms';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import { Button, ButtonToolbar, Alert } from 'react-bootstrap';
import { MetricColumnModal } from '../MetricColumnModal/metricColumnModal';
import { DataListWrapper } from '../Helpers/dataListWrapper';
import { EditableCell, SelectCell, ExpandRowCell ,TextCell, CollapseCell, HeaderCell, SortTypes, StatusCell, IdCell } from '../Helpers/cells';
import { DrillDownView } from '../DrillDownView/drillDownView';
import { EXPANDED_ROW_HEIGHT } from '../DrillDownView/drillDownView.scss';
import {headerText, arrayDiff, reorderArray, capitalize, parseServerError, getRunStatus} from '../Helpers/utils';
import { STATUS, PROBABLY_DEAD_TIMEOUT } from '../../constants/status.constants';
import { ProgressWrapper } from '../Helpers/hoc';
import { toast } from 'react-toastify';
import Select  from 'react-select';
import AsyncCreatableSelect from 'react-select/lib/AsyncCreatable';
import Async from 'react-select/lib/Async';
import { ConfigColumnModal } from "../ConfigColumnModal/configColumnModal";
import PropTypes from 'prop-types';

const DEFAULT_COLUMN_WIDTH = 150;
const DEFAULT_HEADER_HEIGHT = 50;
const DEFAULT_ROW_HEIGHT = 70;
const DEFAULT_EXPANDED_ROW_HEIGHT = Number(EXPANDED_ROW_HEIGHT);
const TAGS_COLUMN_HEADER = 'tags';
const NOTES_COLUMN_HEADER = 'notes';
const EXPERIMENT_NAME = 'experiment_name';
const ID_COLUMN_KEY = '_id';

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
  {label: '==', value: '$eq'},
  {label: '!=', value: '$ne'},
  {label: '<', value: '$lt'},
  {label: '<=', value: '$lte'},
  {label: '>', value: '$gt'},
  {label: '>=', value: '$gte'},
  {label: 'in', value: '$in'},
  {label: 'regex', value: '$regex'}
  ];

export const FILTER_OPERATOR_LABELS = {
  $eq: '==',
  $ne: '!=',
  $lt: '<',
  $lte: '<=',
  $gt: '>',
  $gte: '>=',
  $in: 'in',
  $regex: 'regex'
};

class RunsTable extends Component {
  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['dropdownOptions', 'columnOrder', 'columnWidths', 'defaultSortIndices', 'sortIndices', 'sort',
      'columnNameMap', 'statusFilterOptions', 'filters']
  };

  static propTypes = {
    showConfigColumnModal: PropTypes.bool.isRequired,
    handleConfigColumnModalClose: PropTypes.func.isRequired
  };

  tableWrapperDomNode = null;
  showHideColumnsDomNode = null;
  statusFilterDomNode = null;
  tableDom = null;

  columnNameMap = {}
  
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
      errorMessage: ''
    };
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

  buildQueryJson() {
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
    if (filters && filters.advanced.length) {
      filters.advanced.forEach(filter => {
        if (filter.operator === '$in') {
          const orFilters = filter.name === 'status' ? filter.value.map(statusQueryFilter('$eq')) : [{[filter.name]: filter.value}];
          queryJson.$and.push({'$or': orFilters});
        } else {
          filter.value = isNaN(filter.value) ? filter.value : Number(filter.value);
          if (filter.name === 'status') {
            queryJson.$and.push(statusQueryFilter(filter.operator)(filter.value));
          } else {
            queryJson.$and.push({[filter.name]: {[filter.operator]: filter.value}});
          }
        }
      });
    }
    return queryJson;
  }

  query2string(queryJson) {
    return queryJson.$and.length ? JSON.stringify(queryJson) : {};
  }
  

  parseResponseData(runsResponseData, configColumnsData, columnNameMap) {
    runsResponseData = runsResponseData.map(data => {
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
      if ('heartbeat' in data && data['heartbeat'] && 'start_time' in data)
      data['duration'] = ms(Math.abs(new Date(data['heartbeat']) - new Date(data['start_time'])));

      // Determine if a run is probably dead and assign the status accordingly
      if ('status' in data) {
        data['status'] = getRunStatus(data['status'], data['heartbeat']);
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


      return data;
    });

    return runsResponseData;
  }


  parseMetricsData (metricColumnsData, data, columnNameMap) {
    // Include metric columns
    if (metricColumnsData.length) {
      const metricColumnsObject = {};
      const metricColumnNameMap = {};
      metricColumnsData.forEach(column => {
        let value = 0;
        const metric = data['metrics'].find(metric => metric.name === column.metric_name);
        if (metric && metric.values) {
          const sortedValues = metric.values.sort((a,b) => a-b);
          const extrema = column.extrema;
          if (extrema === 'min') {
            value = sortedValues[0];
          } else if (extrema === 'max') {
            value = sortedValues[sortedValues.length - 1];
          }
        }
        metricColumnsObject[column.name] = value;
        metricColumnNameMap[column.name] = `omniboard.columns.${column.name}`;
      });
      data = {...data, ...metricColumnsObject};
      columnNameMap = {...columnNameMap, ...metricColumnNameMap};
    }
  }
  
  updateTableColumns(dropdownOptions, latestColumnOrder, columnOrder, columnWidths) {
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
  }

  initializeTable(latestColumnOrder, latestDropdownOptions) {
    // Set columns array and dropdown options only the first time data is fetched
    reorderArray(latestColumnOrder, 'status', 'tags');
    reorderArray(latestColumnOrder, 'tags', 'notes');
    reorderArray(latestColumnOrder, 'heartbeat', 'duration');
    reorderArray(latestColumnOrder, '_id', 'experiment_name');
    reorderArray(latestColumnOrder, 'experiment_name', 'hostname');
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
  }

  loadData = () => {
    const _defaultSortIndices = [];
    const queryJson = this.buildQueryJson();
    const queryString = this.query2string(queryJson);
    const {columnOrder, dropdownOptions, columnWidths} = this.state;
    let latestDropdownOptions = [];
    let columnNameMap = {};

    this.setState({
      isTableLoading: true,
      isError: false
    });
    axios.all([
      axios.get('/api/v1/Runs', {
        params: {
          select: '_id,heartbeat,experiment,command,artifacts,host,stop_time,config,' +
          'result,start_time,resources,format,status,omniboard,metrics,meta',
          sort: '-_id',
          query: queryString,
          populate: 'metrics'
        }
      }),
      axios.get('/api/v1/Runs', {
        params: {
          distinct: 'omniboard.tags'
        }
      }),
      axios.get('/api/v1/Omniboard.Columns'),
      axios.get('/api/v1/Omniboard.Config.Columns')
    ])
    .then(axios.spread((runsResponse, tags, metricColumns, configColumns) => {
      if (!runsResponse.data || !runsResponse.data.length) {
        return {
          data: [],
          defaultSortIndices: [],
          sortedData: new DataListWrapper()
        };
      }
      console.log(runsResponse.data)
      var runsResponseData = this.parseResponseData(runsResponse.data, configColumns.data, columnNameMap)

      let latestColumnOrder = runsResponseData.reduce((columns, row) => {
        const configColumnsData = configColumns.data;
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

      // Remove artifacts from it being displayed as a column
      latestColumnOrder.delete('artifacts');

      latestColumnOrder = [...latestColumnOrder];

      if (this.state.data == 0) {
        this.initializeTable(latestColumnOrder, latestDropdownOptions);
      } else {
        this.updateTableColumns(dropdownOptions, latestColumnOrder, columnOrder, columnWidths)
      }
      for (let index = 0; index < runsResponseData.length; index++) {
        _defaultSortIndices.push(index);
      }
      const defaultSortIndices = _defaultSortIndices.length ? _defaultSortIndices : this.state.defaultSortIndices;
      const sortIndices = this.state.sortIndices.length ? this.state.sortIndices : defaultSortIndices;
      const sortedData = new DataListWrapper(sortIndices, runsResponseData);
      this.setState({
        data: runsResponseData,
        defaultSortIndices: _defaultSortIndices,
        columnNameMap,
        isTableLoading: false,
        tags: tags.data
      }, () => {
        // Apply sort if sorting is already enabled
        if (Object.keys(this.state.sort).length) {
          const sortKey = Object.keys(this.state.sort)[0];
          this._onSortChange(sortKey, this.state.sort[sortKey]);
        } else {
          this.setState({sortedData});
        }
      })
    }))
    .catch(error => {
      const errorMessage = parseServerError(error);
      this.setState({
        isTableLoading: false,
        isError: true,
        errorMessage
      })
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
          })
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
        })
      }
    }).catch(error => {
      toast.error(parseServerError(error));
    });
  }

  updateRunningRuns() {
    const {columnOrder, dropdownOptions, columnWidths, columnNameMap} = this.state;
    const queryJson = this.buildQueryJson();

    const heartbeatTimeout = new Date() - PROBABLY_DEAD_TIMEOUT;
    let heartbeat = `>${heartbeatTimeout}`;
    const runningFilter = {'$and': [{'status': STATUS.RUNNING}, {heartbeat}]};
    queryJson.$and.push(runningFilter);
    const queryString = this.query2string(queryJson);
    axios.all([
      axios.get('/api/v1/Runs', {
        params: {
          select: '_id,heartbeat,artifacts,stop_time,' +
          'result,start_time,resources,format,status,omniboard,metrics,meta',
          sort: '-_id',
          query: queryString,
          populate: 'metrics'
        }
      }),
      axios.get('/api/v1/Runs', {
        params: {
          distinct: 'omniboard.tags'
        }
      }),
      axios.get('/api/v1/Omniboard.Columns'),
      axios.get('/api/v1/Omniboard.Config.Columns')
    ])
    .then(axios.spread((runsResponse, tags, metricColumns, configColumns) => {
      var runsResponseData = this.parseResponseData(runsResponse.data, configColumns.data, columnNameMap)
      const sortIndices = this.state.sortIndices.length ? this.state.sortIndices : this.state.defaultSortIndices;
      const sortedData = new DataListWrapper(sortIndices, runsResponseData);
      this.setState({
        data: runsResponseData
      });

    }))
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
    })
  };

  _getSortedData = (sortIndices, data, columnKey, sortDir) => {
    sortIndices.sort((indexA, indexB) => {
      const valueA = data[indexA][columnKey];
      const valueB = data[indexB][columnKey];
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

  _onSortChange = (columnKey, sortDir) => {
    const {data, defaultSortIndices} = this.state;
    let sortIndices = defaultSortIndices.slice();
    // Expanded rows uses rowId to expand a row. Reset the expanded rows state while sorting
    this._resetExpandedRows();
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
      tableHeight: window.innerHeight ? window.innerHeight - this.tableWrapperDomNode.offsetTop : tableHeight
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
    this.interval = setInterval(() => this.updateRunningRuns(), 1000); 
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
    const runId = this.state.sortedData.getObjectAt(rowIndex)['_id'];
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
      if (option.value !== 'duration') {
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
      if (filterColumnName.length && !['_id', 'start_time', 'stop_time', 'heartbeat', 'duration'].includes(filterColumnName)) {
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
      // Apply sort if sorting is already enabled
      if (Object.keys(sort).length) {
        const sortKey = Object.keys(sort)[0];
        const sortedData = this._getSortedData(defaultSortIndices.slice(), data, sortKey, sort[sortKey]);
        this.setState({
          data,
          defaultSortIndices,
          sortedData,
          sortIndices: sortedData.getIndexArray()
        });
      } else {
        this.setState({
          data,
          defaultSortIndices,
          sortedData: new DataListWrapper(defaultSortIndices, data),
          sortIndices: defaultSortIndices
        });
      }
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
      filters, currentColumnValueOptions, columnNameMap, filterOperatorAsyncValueOptionsKey } = this.state;
    const {showConfigColumnModal, handleConfigColumnModalClose} = this.props;
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
      </div>
    );
  }
}

reactMixin(RunsTable.prototype, LocalStorageMixin);
export default RunsTable;
