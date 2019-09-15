import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import {Well} from 'react-bootstrap';
import './selectRunsToCompare.scss';

class SelectRunsToCompare extends PureComponent {
  static propTypes = {
    runIds: PropTypes.arrayOf(Number).isRequired,
    runId1: PropTypes.string.isRequired,
    runId2: PropTypes.string.isRequired,
    callback: PropTypes.func.isRequired
  };

  render() {
    const {runIds, runId1, runId2, callback} = this.props;
    const getOption = value => {
      return {label: value, value};
    };

    const runIdOptions = runIds.map(runId => {
      return {
        label: String(runId),
        value: String(runId)
      };
    });

    return (
      <Well bsSize='sm'>
        <div className='row'>
          <div className='col-xs-6 text-center select-container'>
            <h5>Run 1: </h5>
            <Select
              className='select-run-id'
              options={runIdOptions}
              value={getOption(runId1)}
              onChange={callback('runId1')}
            />
          </div>
          <div className='col-xs-6 text-center select-container'>
            <h5>Run 2: </h5>
            <Select
              className='select-run-id'
              options={runIdOptions}
              value={getOption(runId2)}
              onChange={callback('runId2')}
            />
          </div>
        </div>
      </Well>
    );
  }
}

export {SelectRunsToCompare};
