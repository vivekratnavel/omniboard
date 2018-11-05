import React, { Component } from 'react';
import axios from 'axios';
import Multiselect from 'react-bootstrap-multiselect';
import { Table, Column } from 'fixed-data-table-2';
import LocalStorageMixin from 'react-localstorage';
import reactMixin from 'react-mixin';
import ms from 'ms';
import './runsTable.scss';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import { Button, ButtonToolbar, Alert } from 'react-bootstrap';
import { MetricColumnModal } from '../MetricColumnModal/metricColumnModal';
import { DataListWrapper } from '../Helpers/dataListWrapper';
import { EditableCell, SelectCell, ExpandRowCell ,TextCell, CollapseCell, HeaderCell, SortTypes, StatusCell } from '../Helpers/cells';
import { DrillDownView } from '../DrillDownView/drillDownView';
import { EXPANDED_ROW_HEIGHT } from '../DrillDownView/drillDownView.scss';
import { headerText, arrayDiff, reorderArray, capitalize, parseServerError } from '../Helpers/utils';
import { STATUS, PROBABLY_DEAD_TIMEOUT } from '../../constants/status.constants';
import { ProgressWrapper } from '../Helpers/hoc';
import { toast } from 'react-toastify';
import Select, { components } from 'react-select';

const DEFAULT_COLUMN_WIDTH = 150;
const DEFAULT_HEADER_HEIGHT = 50;
const DEFAULT_ROW_HEIGHT = 100;
const DEFAULT_EXPANDED_ROW_HEIGHT = Number(EXPANDED_ROW_HEIGHT);
const TAGS_COLUMN_HEADER = 'tags';
const NOTES_COLUMN_HEADER = 'notes';
const EXPERIMENT_NAME = 'experiment_name';

function getStatusLabel(label) {
  return `<div class="clearfix">
            <div class="circle ${label} float-left"></div>
            <div class="status-text float-left">${capitalize(label)}</div>
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

class RunsTable extends Component {
  // Filter out state objects that need to be synchronized with local storage
  static defaultProps = {
    stateFilterKeys: ['dropdownOptions', 'columnOrder', 'columnWidths', 'defaultSortIndices', 'sortIndices', 'sort']
  };

  tableWrapperDomNode = null;
  showHideColumnsDomNode = null;
  statusFilterDomNode = null;
  tableDom = null;
  
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
      filters: {},
      tags: [],
      filterValues: [],
      expandedRows: new Set(),
      scrollToRow: null,
      showMetricColumnModal: false,
      isError: false,
      errorMessage: ''
    };
  }

  loadData = () => {
    const {filters, columnOrder, dropdownOptions, columnWidths} = this.state;
    let latestDropdownOptions = [];
    const queryJson = {'$and': []};
    if (filters && filters.status && filters.status.length) {
      const statusFilter = filters.status.map(status => {
        if (status === STATUS.PROBABLY_DEAD || status === STATUS.RUNNING) {
          // Apply condition to filter "probably dead" status
          // "PROBABLY_DEAD" status is given to runs which are running, but the last heartbeat was at-least 120000ms ago
          const heartbeatTimeout = new Date() - PROBABLY_DEAD_TIMEOUT;
          const heartbeat = status === STATUS.PROBABLY_DEAD ? `<${heartbeatTimeout}` : `>${heartbeatTimeout}`;
          return {'$and': [{'status': STATUS.RUNNING}, {heartbeat}]};
        }
        return {status};
      });
      queryJson.$and.push({'$or': statusFilter});
    }
    if (filters && filters.tags && filters.tags.length) {
      queryJson.$and.push({'$or': [{'omniboard.tags': filters.tags}]});
    }
    const queryString = queryJson.$and.length ? JSON.stringify(queryJson) : {};
    this.setState({
      isTableLoading: true,
      isError: false
    });
    axios.all([
      axios.get('/api/v1/Runs', {
        params: {
          select: '_id,heartbeat,experiment,command,artifacts,host,stop_time,config,' +
          'result,start_time,resources,format,status,omniboard,metrics',
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
      axios.get('/api/v1/Omniboard.Columns')
    ])
    .then(axios.spread((runsResponse, tags, metricColumns) => {
      let runsResponseData = runsResponse.data;
      const metricColumnsData = metricColumns.data;
      const duration = 'duration';
      if (runsResponseData && runsResponseData.length) {
        const _defaultSortIndices = [];
        runsResponseData = runsResponseData.map(data => {
          if ('config' in data) {
            const config = data['config'];
            // Expand each key of config column as individual columns
            delete data['config'];
            data = {...data, ...config};
          }
          if ('experiment' in data) {
            const experiment = data['experiment'];
            delete data['experiment'];
            data = {...data, 'experiment_name': experiment['name']};
          }
          if ('host' in data) {
            const host = data['host'];
            delete data['host'];
            data = {...data, 'hostname': host['hostname']};
          }

          // Add duration column; duration = heartbeat - start_time
          if ('heartbeat' in data && 'start_time' in data)
          data[duration] = ms(Math.abs(new Date(data['heartbeat']) - new Date(data['start_time'])));

          // Determine if a run is probably dead and assign the status accordingly
          if ('status' in data) {
            if (data['status'] === STATUS.RUNNING && (new Date() - new Date(data['heartbeat']) > 120000)) {
              data['status'] = STATUS.PROBABLY_DEAD;
            }
          }

          // Expand omniboard columns
          if ('omniboard' in data) {
            const omniboard = data['omniboard'];
            delete data['omniboard'];
            data = {...data, ...omniboard};
          }

          // Include metric columns
          if (metricColumnsData.length) {
            const metricColumnsObject = {};
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
            });
            data = {...data, ...metricColumnsObject};
          }
          return data;
        });

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

        // Remove artifacts from it being displayed as a column
        latestColumnOrder.delete('artifacts');

        latestColumnOrder = [...latestColumnOrder];

        // Set columns array and dropdown options only the first time data is fetched
        if (this.state.data === null) {
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
        } else {
          // Handle addition/deletion of metric columns
          const dropdownOptionValues = dropdownOptions.map(option => option.value);
          const columnsToAdd = arrayDiff(latestColumnOrder, dropdownOptionValues);

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
        }

        for (let index = 0; index < runsResponseData.length; index++) {
          _defaultSortIndices.push(index);
        }
        const defaultSortIndices = _defaultSortIndices.length ? _defaultSortIndices : this.state.defaultSortIndices;
        const sortIndices = this.state.sortIndices.length ? this.state.sortIndices : defaultSortIndices;
        const sortedData = new DataListWrapper(sortIndices, runsResponseData);
        this.setState({
          data: runsResponseData,
          defaultSortIndices: _defaultSortIndices
        }, () => {
          // Apply sort if sorting is already enabled
          if (Object.keys(this.state.sort).length) {
            const sortKey = Object.keys(this.state.sort)[0];
            this._onSortChange(sortKey, this.state.sort[sortKey]);
          } else {
            this.setState({sortedData});
          }
        });
      } else {
        // If response is empty, set empty array for table data
        this.setState({
          data: [],
          defaultSortIndices: [],
          sortedData: new DataListWrapper()
        })
      }
      this.setState({
        isTableLoading: false,
        tags: tags.data
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

  _onSortChange = (columnKey, sortDir) => {
    const {data, defaultSortIndices} = this.state;
    let sortIndices = defaultSortIndices.slice();
    // Expanded rows uses rowId to expand a row. Reset the expanded rows state while sorting
    this._resetExpandedRows();
    if (sortIndices && sortIndices.length) {
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
      const sortedData = new DataListWrapper(sortIndices, data);
      this.setState({
        sortedData,
        sort: {
          [columnKey]: sortDir,
        },
        sortIndices
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
  }

  /**
   * Remove event listener
   */
  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeTable);
  }

  componentWillMount() {
    this.loadData();
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
    // Local storage key is used for synchronizing state of each drilldown view with local storage
    const localStorageKey = `DrillDownView|${runId}`;
    return (
      <DrillDownView width={width} height={height} runId={runId} localStorageKey={localStorageKey}/>
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
        changeHandler={this._handleNotesChange}/>
    }
    if (columnKey === EXPERIMENT_NAME) {
      cell = <StatusCell data={rowData}/>
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

  _handleMetricColumnModalClose = () => {
    this.setState({
      showMetricColumnModal: false
    });
  };

  get filterOptions() {
    const {tags} = this.state;
    return [
      {
        label: 'Tags',
        options: tags.map(tag => {return {value: tag, label: tag, group: 'tag'}})
      },
    ];
  }

  _handleFilterChange = (values) => {
    const optionValues = values.map(optionValue => optionValue.value);
    const updateFilter = () => {
      const {filters} = this.state;
      const newFilters = Object.assign({}, filters, {tags: optionValues});
      this.setState({
        filters: newFilters
      }, this.loadData);
    };
    this.setState({
      filterValues: values
    }, updateFilter);
  };

  handleMetricColumnDelete = (columnName) => {
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

  render() {
    const { sortedData, sort, columnOrder, expandedRows, scrollToRow, dropdownOptions, tableWidth, tableHeight,
      columnWidths, statusFilterOptions, showMetricColumnModal, isError, errorMessage, isTableLoading, filterValues } = this.state;
    let rowData = new DataListWrapper();
    if (sortedData && sortedData.getSize()) {
      const indexArray = sortedData.getIndexArray();
      const _rowData = sortedData.getDataArray().map( row => {
        return Object.keys(row).map( key => {
          let value = '';
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
    // Override filter label to display in the format "ColumnName: Value"
    const MultiValueLabel = (props) => {
      const newProps = Object.assign({}, props, {children: `${capitalize(props.data.group)}: ${props.data.label}`});
      return (
        <components.MultiValueLabel {...newProps}/>
      );
    };
    return (
      <div>
        <div className="table-header">
          <div className="row">
            <div className="col col-xs-2">
              <div className="status-filter float-left">
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
            <div className="col col-xs-6">
              <div className="filters">
                <label className="filters-label">Filters: </label>
                <div className="filters-select-container">
                  <Select
                    isMulti
                    options={this.filterOptions}
                    onChange={this._handleFilterChange}
                    value={filterValues}
                    menuPortalTarget={document.body}
                    placeholder="Add Filters..."
                    components={{MultiValueLabel}}
                    />
                </div>
              </div>
            </div>
            <div className="col col-xs-4">
              <div className="show-hide-columns float-right">
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
              <ButtonToolbar className="float-right">
                <div className="add-remove-metric-columns float-right">
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
            <Alert variant="danger">{errorMessage}</Alert>
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
                {columnOrder.map((columnKey, i) => {
                  return <Column
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
                  />;
                })}
              </Table>
            </ProgressWrapper>
          }
        </div>
        <MetricColumnModal show={showMetricColumnModal} handleClose={this._handleMetricColumnModalClose}
                           handleDataUpdate={this.loadData} handleDelete={this.handleMetricColumnDelete}/>
      </div>
    );
  }
}

reactMixin(RunsTable.prototype, LocalStorageMixin);
export default RunsTable;
