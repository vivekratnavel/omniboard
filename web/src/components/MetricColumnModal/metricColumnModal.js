import PropTypes from 'prop-types'
import React, { PureComponent } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, FormControl, FormGroup, Alert } from 'react-bootstrap';
import './metricColumnModal.scss';
import axios from 'axios';
import Select from 'react-select';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';

class MetricColumnModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleDataUpdate: PropTypes.func,
    handleDelete: PropTypes.func,
    show: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      initialColumns: [],
      columns: [],
      metricNames: [],
      isLoadingMetricNames: false,
      isLoadingColumns: false,
      isInProgress: false
    }
  }

  static serializeColumn = (column) => {
    return {
      name: column.columnName,
      metric_name: column.metricName,
      extrema: column.extrema
    };
  };

  _handleDataUpdate = () => {
    this.props.handleDataUpdate();
  };

  _handleDelete = (columnName) => {
    this.props.handleDelete(columnName);
  };

  _handleApply = () => {
    const {columns, initialColumns} = this.state;
    const columnsClone = columns.slice();
    const newColumns = columnsClone.filter(column => column.id === null);
    // Get columns that were edited/modified
    const dirtyColumns = initialColumns.reduce( (accumulator, current, index) => {
      // Exclude newly added columns with id as "null" and columns that did not go through any change
      if (columns[index].id && JSON.stringify(columns[index]) !== JSON.stringify(current)) {
        accumulator.push(columns[index]);
      }
      return accumulator;
    }, []);
    const createRequests = newColumns.map(column => axios.post('/api/v1/Omniboard.Columns', MetricColumnModal.serializeColumn(column)));
    const updateRequests = dirtyColumns.map(column => axios.post(`/api/v1/Omniboard.Columns/${column.id}`, MetricColumnModal.serializeColumn(column)));
    const requests = createRequests.concat(updateRequests);
    const closeModal = () => {
      this.setState({ isInProgress: false });
      this.props.handleClose();
    };
    const sendUpdateRequests = () => {
      axios.all(updateRequests).then(
        res => {
          const errors = res.filter(response => response.status !== 200);
          if (errors.length) {
            this.setState({
              isInProgress: false,
              error: parseServerError(errors[0])
            });
          } else if (createRequests.length) {
            sendCreateRequests();
          } else {
            this.setState({
              isInProgress: false
            });
            this._handleDataUpdate();
            closeModal();
          }
        }).catch(error => {
        this.setState({
          isInProgress: false,
          error: parseServerError(error)
        });
      })
    };
    const sendCreateRequests = () => {
      axios.all(createRequests).then(axios.spread((...res) => {
        const errors = res.filter(response => response.status !== 201);
        this.setState({
          isInProgress: false
        });
        if (errors.length) {
          this.setState({
            error: parseServerError(errors[0])
          });
        } else {
          this._handleDataUpdate();
          closeModal();
        }
      })).catch(error => {
        this.setState({
          isInProgress: false,
          error: parseServerError(error)
        });
      });
    };
    if (requests.length) {
      this.setState({isInProgress: true, error: ''});
      if (updateRequests.length) {
        sendUpdateRequests();
      } else {
        sendCreateRequests();
      }
    } else {
      this.setState({
        error: 'There are no changes to be applied'
      });
    }
  };

  _handleDeleteColumn = (key) => {
    return (e) => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      if (columns[key].id) {
        axios.delete('/api/v1/Omniboard.Columns/' + columns[key].id).then(response => {
          if (response.status === 204) {
            columnsClone.splice(key, 1);
            this.setState({
              columns: columnsClone
            });
            this._handleDelete(columns[key].columnName);
          } else {
            this.setState({
              error: parseServerError(response)
            });
          }
        }).catch(error => {
          this.setState({
            error: parseServerError(error)
          })
        });
      } else {
        // If id is null, it is not yet persisted in database and
        // should just be removed from the UI
        columnsClone.splice(key, 1);
        this.setState({
          columns: columnsClone
        });
      }
    }
  };

  _handleAddColumn = () => {
    const columnsClone = this.state.columns.slice();
    columnsClone.push({
      id: null,
      columnName: '',
      metricName: '',
      extrema: ''
    });
    this.setState({
      columns: columnsClone
    });
  };

  _handleColumnNameChange = (key) => {
    return (e) => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      columnsClone[key].columnName = e.target.value;
      this.setState({
        columns: columnsClone
      });
    }
  };

  _handleMetricNameChange = (key) => {
    return ({value}) => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      columnsClone[key].metricName = value;
      this.setState({
        columns: columnsClone
      });
    }
  };

  _handleExtremaChange = (key) => {
    return ({value}) => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      columnsClone[key].extrema = value;
      this.setState({
        columns: columnsClone
      });
    }
  };

  get isFormDirty() {
    const {initialColumns, columns} = this.state;
    return initialColumns.length !== columns.length || JSON.stringify(initialColumns) !== JSON.stringify(columns);
  }

  fetchMetricColumns = () => {
    this.setState({
      isLoadingColumns: true,
      error: ''
    });
    axios.get('/api/v1/Omniboard.Columns').then( response => {
      const columns = response.data.map(column => {
        return {
          id: column._id,
          columnName: column.name,
          metricName: column.metric_name,
          extrema: column.extrema
        }
      });
      this.setState({
        columns,
        initialColumns: JSON.parse(JSON.stringify(columns)),
        isLoadingColumns: false
      });
    }).catch(error => {
      const message = parseServerError(error);
      this.setState({
        isLoadingColumns: false,
        error: message
      });
    });
  };

  fetchMetricNames = () => {
    this.setState({
      isLoadingMetricNames: true
    });
    axios.get('/api/v1/Metrics', {
      params: {
        distinct: 'name'
      }
    }).then( response => {
      this.setState({
        metricNames: response.data,
        isLoadingMetricNames: false
      });
    });
  };

  get isSubmitDisabled() {
    const {columns, isInProgress} = this.state;
    let isDisabled = false;
    if (columns.length) {
      columns.forEach(c => {
        if (!c.columnName || !c.metricName || !c.extrema) {
          isDisabled = true;
        }
      })
    } else {
      isDisabled = true;
    }
    return isDisabled || !this.isFormDirty || isInProgress;
  }

  componentDidMount() {
    // Load data only when the component is being displayed
    if (this.props.show === true) {
      this.fetchMetricColumns();
      this.fetchMetricNames();
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Load data every time this modal is being popped up
    if (prevProps.show !== this.props.show && this.props.show === true) {
      this.fetchMetricColumns();
      this.fetchMetricNames();
    }
  }

  render() {
    const {show, handleClose} = this.props;
    const {columns, metricNames, isLoadingMetricNames, isLoadingColumns, isInProgress, error} = this.state;
    const getValidationState = (columnRow, key) => {
      return !columnRow[key] ? 'error' : 'success';
    };
    const metricNameOptions = metricNames.map(name => {
      return {
        label: name,
        value: name
      }
    });
    const extremaOptions = [{
      label: 'average',
      value: 'average'
    },{
      label: 'min',
      value: 'min'
    }, {
      label: 'max',
      value: 'max'
    },{
      label: 'last',
      value: 'last'
    }];
    const getSelectValue = (options, value) => {
      const selectValue = options.find(option => option.value === value);
      return selectValue ? selectValue : '';
    };
    const renderColumnRow = (columnRow, key) => {
      return (
        <div className="row" key={key}>
          <div className="col-xs-4">
            <FormGroup
              controlId="formColumnName"
              validationState={getValidationState(columnRow, 'columnName')}
            >
              <FormControl
                type="text"
                test-attr={"column-name-text-" + key}
                value={columnRow.columnName}
                placeholder="Enter column name"
                onChange={this._handleColumnNameChange(key)}
              />
            </FormGroup>
          </div>
          <div className="col-xs-4">
            <Select
              test-attr={"metric-name-" + key}
              options={metricNameOptions}
              onChange={this._handleMetricNameChange(key)}
              value={getSelectValue(metricNameOptions, columnRow.metricName)}
              isLoading={isLoadingMetricNames}
              clearable={false}
              placeholder="Metric Name"
            />
          </div>
          <div className="col-xs-3">
            <Select
              test-attr={"extrema-" + key}
              options={extremaOptions}
              onChange={this._handleExtremaChange(key)}
              value={getSelectValue(extremaOptions, columnRow.extrema)}
              clearable={false}
              placeholder="Extrema"
            />
          </div>
          <div className="col-xs-1">
            <i className='glyphicon glyphicon-remove delete-icon' test-attr={"delete-" + key} onClick={this._handleDeleteColumn(key)}/>
          </div>
        </div>
      )
    };

    const submitButtonText = isInProgress ? <span>
      <i className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/> Applying...</span>: <span>Apply</span>;

    const errorAlert = error ? <Alert bsStyle="danger">{error}</Alert> : '';

    return(
      <Modal show={show} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>Manage Metric Columns</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{paddingBottom: '15px'}}>
            Add a column to display Min/Max of any metric value
          </div>
          {errorAlert}
          <ProgressWrapper loading={isLoadingColumns}>
            <div>
              <form>
                {columns.map( (columnRow, i) => renderColumnRow(columnRow, i))}
              </form>
            </div>
          </ProgressWrapper>
          <div>
            <Button test-attr="add-column-btn"  bsStyle="info" bsSize="small" onClick={this._handleAddColumn}>
              <span className="glyphicon glyphicon-plus" aria-hidden="true"/> Add Column
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button test-attr="close-btn" onClick={handleClose}>Close</Button>
          <Button test-attr="apply-btn" bsStyle="primary" onClick={this._handleApply} disabled={this.isSubmitDisabled}>
            {submitButtonText}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export {MetricColumnModal};
