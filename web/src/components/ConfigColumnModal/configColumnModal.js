import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, FormControl, FormGroup, Alert } from 'react-bootstrap';
import './configColumnModal.scss';
import axios from 'axios';
import backend from '../Backend/backend';
import Select from 'react-select';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';

class ConfigColumnModal extends PureComponent {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleDelete: PropTypes.func.isRequired,
    handleDataUpdate: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
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
    }
  }

  static serializeColumn = (column) => {
    return {
      name: column.columnName,
      config_path: column.configPath
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
    const createRequests = newColumns.map(column => backend.post('api/v1/Omniboard.Config.Columns', ConfigColumnModal.serializeColumn(column)));
    const updateRequests = dirtyColumns.map(column => backend.post(`api/v1/Omniboard.Config.Columns/${column.id}`, ConfigColumnModal.serializeColumn(column)));
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
        backend.delete('api/v1/Omniboard.Config.Columns/' + columns[key].id).then(response => {
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
      configPath: ''
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

  _handleConfigPathChange = (key) => {
    return ({value}) => {
      const {columns} = this.state;
      const columnsClone = columns.slice();
      columnsClone[key].configPath = value;
      this.setState({
        columns: columnsClone
      });
    }
  };

  get isFormDirty() {
    const {initialColumns, columns} = this.state;
    return initialColumns.length !== columns.length || JSON.stringify(initialColumns) !== JSON.stringify(columns);
  }

  fetchConfigColumns = () => {
    this.setState({
      isLoadingColumns: true,
      error: ''
    });
    backend.get('api/v1/Omniboard.Config.Columns').then( response => {
      const columns = response.data.map(column => {
        return {
          id: column._id,
          columnName: column.name,
          configPath: column.config_path
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

  fetchConfigPaths = () => {
    this.setState({
      isLoadingConfigs: true
    });
    backend.get('api/v1/Runs', {
      params: {
        distinct: 'config'
      }
    }).then( response => {
      // Recursively get all config paths
      const getAllPaths = (prefix, data) => {
        return Object.keys(data).reduce((paths, key) => {
          if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key]) {
            const newPaths = Object.keys(data[key]).reduce((acc, item) => {
              if (typeof data[key][item] !== 'object' && data[key][item]) {
                const path = prefix ? `${prefix}.${key}.${item}` : `${key}.${item}`;
                acc.push(path);
              }
              return acc;
            }, []);
            const recursivePaths = getAllPaths(key, data[key]);
            return [...paths, ...recursivePaths, ...newPaths];
          }
          return paths;
        }, []);
      };

      const configPaths = response.data.reduce((acc, current) => {
        const keys = getAllPaths('', current);
        return [...new Set([...acc, ...keys])];
      }, []);

      const error = configPaths.length ? '' : 'There are no nested config parameters available to add a new column';
      this.setState({
        configPaths,
        error,
        isLoadingConfigs: false
      });
    });
  };

  get isSubmitDisabled() {
    const {columns, isInProgress} = this.state;
    let isDisabled = false;
    if (columns.length) {
      columns.forEach(c => {
        if (!c.columnName || !c.configPath) {
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
      this.fetchConfigColumns();
      this.fetchConfigPaths();
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Load data every time this modal is being popped up
    if (prevProps.show !== this.props.show && this.props.show === true) {
      this.fetchConfigColumns();
      this.fetchConfigPaths();
    }
  }

  render() {
    const {show, handleClose} = this.props;
    const {columns, configPaths, isLoadingConfigs, isLoadingColumns, isInProgress, error} = this.state;
    const getValidationState = (columnRow, key) => {
      return !columnRow[key] ? 'error' : 'success';
    };
    const configPathOptions = configPaths.map(name => {
      return {
        label: name,
        value: name
      }
    });
    const getSelectValue = (options, value) => {
      const selectValue = options.find(option => option.value === value);
      return selectValue ? selectValue : '';
    };
    const renderColumnRow = (columnRow, key) => {
      return (
        <div className="row" key={key}>
          <div className="col col-xs-5">
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
          <div className="col col-xs-5">
            <Select
              test-attr={"config-path-" + key}
              options={configPathOptions}
              onChange={this._handleConfigPathChange(key)}
              value={getSelectValue(configPathOptions, columnRow.configPath)}
              isLoading={isLoadingConfigs}
              clearable={false}
              placeholder="Config Path"
            />
          </div>
          <div className="col col-xs-2">
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
          <ModalTitle>Manage Config Columns</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{paddingBottom: '15px'}}>
            Add Column to expand any nested config parameter into a new column
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
            <Button test-attr="add-column-btn" bsStyle="info" bsSize="small" onClick={this._handleAddColumn}>
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

export {ConfigColumnModal};
