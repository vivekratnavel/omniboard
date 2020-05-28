import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, FormControl, FormGroup, Alert} from 'react-bootstrap';
import './customColumnModal.scss';
import axios from 'axios';
import CreatableSelect from 'react-select/lib/Creatable';
import backend from '../Backend/backend';
import {ProgressWrapper} from '../Helpers/hoc';
import {parseServerError, getAllPaths} from '../Helpers/utils';

class CustomColumnModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleDelete: PropTypes.func.isRequired,
    handleDataUpdate: PropTypes.func.isRequired,
    shouldShow: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      initialColumns: [],
      columns: [],
      configPaths: [],
      isLoadingConfigs: false,
      isLoadingColumns: false,
      isInProgress: false
    };
  }

  static serializeColumn = column => {
    return {
      name: column.columnName,
      config_path: column.configPath
    };
  };

  _handleDataUpdate = () => {
    this.props.handleDataUpdate();
  };

  _handleDelete = columnName => {
    this.props.handleDelete(columnName);
  };

  _handleApply = () => {
    const {columns, initialColumns} = this.state;
    const columnsClone = columns.slice();
    const newColumns = columnsClone.filter(column => column.id === null);
    // Get columns that were edited/modified
    const dirtyColumns = initialColumns.reduce((accumulator, current, index) => {
      // Exclude newly added columns with id as "null" and columns that did not go through any change
      const column = columnsClone.find(column => column.id === current.id);
      if (column && JSON.stringify(column) !== JSON.stringify(current)) {
        accumulator.push(columns[index]);
      }

      return accumulator;
    }, []);
    const createRequests = newColumns.map(column => backend.post('api/v1/Omniboard.Custom.Columns', CustomColumnModal.serializeColumn(column)));
    const updateRequests = dirtyColumns.map(column => backend.post(`api/v1/Omniboard.Custom.Columns/${column.id}`, CustomColumnModal.serializeColumn(column)));
    const requests = createRequests.concat(updateRequests);
    const closeModal = () => {
      this.setState({isInProgress: false});
      this.props.handleClose();
    };

    const sendUpdateRequests = () => {
      axios.all(updateRequests).then(
        res => {
          const errors = res.filter(response => response.status !== 200);
          if (errors.length > 0) {
            this.setState({
              isInProgress: false,
              error: parseServerError(errors[0])
            });
          } else if (createRequests.length > 0) {
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
      });
    };

    const sendCreateRequests = () => {
      axios.all(createRequests).then(axios.spread((...res) => {
        const errors = res.filter(response => response.status !== 201);
        this.setState({
          isInProgress: false
        });
        if (errors.length > 0) {
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

    if (requests.length > 0) {
      this.setState({isInProgress: true, error: ''});
      if (updateRequests.length > 0) {
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

  _handleDeleteColumn = key => {
    return _ => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      if (columns[key].id) {
        backend.delete('api/v1/Omniboard.Custom.Columns/' + columns[key].id).then(response => {
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
          });
        });
      } else {
        // If id is null, it is not yet persisted in database and
        // should just be removed from the UI
        columnsClone.splice(key, 1);
        this.setState({
          columns: columnsClone
        });
      }
    };
  };

  _handleAddColumn = () => {
    this.setState(prevState => {
      const columnsClone = prevState.columns.slice();
      columnsClone.push({
        id: null,
        columnName: '',
        configPath: ''
      });
      return {columns: columnsClone};
    });
  };

  _handleColumnNameChange = key => {
    return e => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      columnsClone[key].columnName = e.target.value;
      this.setState({
        columns: columnsClone
      });
    };
  };

  _handleConfigPathChange = key => {
    return ({value}) => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      columnsClone[key].configPath = value;
      this.setState({
        columns: columnsClone
      });
    };
  };

  get isFormDirty() {
    const {initialColumns, columns} = this.state;
    return initialColumns.length !== columns.length || JSON.stringify(initialColumns) !== JSON.stringify(columns);
  }

  fetchCustomColumns = () => {
    this.setState({
      isLoadingColumns: true,
      error: ''
    });
    backend.get('api/v1/Omniboard.Custom.Columns').then(response => {
      const columns = response.data.map(column => {
        return {
          id: column._id,
          columnName: column.name,
          configPath: column.config_path
        };
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

  fetchConfigPaths = () => {
    this.setState({
      isLoadingConfigs: true
    });

    axios.all([
      backend.get('api/v1/Runs', {
        params: {
          distinct: 'config'
        }
      }),
      backend.get('api/v1/Runs', {
        params: {
          distinct: 'host'
        }
      }),
      backend.get('api/v1/Runs', {
        params: {
          distinct: 'experiment'
        }
      })
    ]).then(axios.spread((configResponse, hostResponse, experimentResponse) => {
      // Recursively get all config paths
      const configPaths = configResponse.data.reduce((acc, current) => {
        const keys = getAllPaths('config', current);
        return [...new Set([...acc, ...keys])];
      }, []);

      // Recursively get all host paths
      const hostPaths = hostResponse.data.reduce((acc, current) => {
        const keys = getAllPaths('host', current);
        return [...new Set([...acc, ...keys])];
      }, []);

      // Recursively get all experiment paths
      const experimentPaths = experimentResponse.data.reduce((acc, current) => {
        const keys = getAllPaths('experiment', current);
        return [...new Set([...acc, ...keys])];
      }, []);

      const paths = [...configPaths, ...hostPaths, ...experimentPaths];
      const error = paths.length > 0 ? '' : 'There are no nested config parameters available to add a new column';
      this.setState({
        configPaths: paths,
        error,
        isLoadingConfigs: false
      });
    }));
  };

  get isSubmitDisabled() {
    const {columns, isInProgress} = this.state;
    let isDisabled = false;
    if (columns.length > 0) {
      columns.forEach(c => {
        if (!c.columnName || !c.configPath) {
          isDisabled = true;
        }
      });
    } else {
      isDisabled = true;
    }

    return isDisabled || !this.isFormDirty || isInProgress;
  }

  componentDidMount() {
    // Load data only when the component is being displayed
    if (this.props.shouldShow === true) {
      this.fetchCustomColumns();
      this.fetchConfigPaths();
    }
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    // Load data every time this modal is being popped up
    if (prevProps.shouldShow !== this.props.shouldShow && this.props.shouldShow === true) {
      this.fetchCustomColumns();
      this.fetchConfigPaths();
    }
  }

  render() {
    const {shouldShow, handleClose} = this.props;
    const {columns, configPaths, isLoadingConfigs, isLoadingColumns, isInProgress, error} = this.state;
    const getValidationState = (columnRow, key) => {
      return columnRow[key] ? 'success' : 'error';
    };

    const configPathOptions = configPaths.map(name => {
      return {
        label: name,
        value: name
      };
    });
    const getCreateLabel = input => input;
    const getSelectValue = value => {
      return {label: value, value};
    };

    const renderColumnRow = (columnRow, key) => {
      return (
        <div key={key} className='row'>
          <div className='col col-xs-5'>
            <FormGroup
              controlId='formColumnName'
              validationState={getValidationState(columnRow, 'columnName')}
            >
              <FormControl
                type='text'
                test-attr={'column-name-text-' + key}
                value={columnRow.columnName}
                placeholder='Enter column name'
                onChange={this._handleColumnNameChange(key)}
              />
            </FormGroup>
          </div>
          <div className='col col-xs-5'>
            <CreatableSelect
              test-attr={'config-path-' + key}
              options={configPathOptions}
              value={getSelectValue(columnRow.configPath)}
              formatCreateLabel={getCreateLabel}
              isLoading={isLoadingConfigs}
              clearable={false}
              placeholder='Path'
              onChange={this._handleConfigPathChange(key)}
            />
          </div>
          <div className='col col-xs-2'>
            <i className='glyphicon glyphicon-remove delete-icon' test-attr={'delete-' + key} onClick={this._handleDeleteColumn(key)}/>
          </div>
        </div>
      );
    };

    const submitButtonText = isInProgress ? (
      <span>
        <i className='glyphicon glyphicon-refresh glyphicon-refresh-animate'/> Applying...
      </span>
    ) : <span>Apply</span>;

    const errorAlert = error ? <Alert bsStyle='danger'>{error}</Alert> : '';

    return (
      <Modal show={shouldShow} onHide={handleClose}>
        <ModalHeader closeButton>
          <ModalTitle>Manage Custom Columns</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{paddingBottom: '15px'}}>
            Add Column to expand any nested config / custom parameter into a new column
          </div>
          {errorAlert}
          <ProgressWrapper loading={isLoadingColumns}>
            <div>
              <form>
                {columns.map((columnRow, i) => renderColumnRow(columnRow, i))}
              </form>
            </div>
          </ProgressWrapper>
          <div>
            <Button test-attr='add-column-btn' bsStyle='info' bsSize='small' onClick={this._handleAddColumn}>
              <span className='glyphicon glyphicon-plus' aria-hidden='true'/> Add Column
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button test-attr='close-btn' onClick={handleClose}>Close</Button>
          <Button test-attr='apply-btn' bsStyle='primary' disabled={this.isSubmitDisabled} onClick={this._handleApply}>
            {submitButtonText}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export {CustomColumnModal};
