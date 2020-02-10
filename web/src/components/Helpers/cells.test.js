import React from 'reactn';
import {toast} from 'react-toastify';
import mockAxios from 'jest-mock-axios';
import {TextCell, SelectCell, HeaderCell, ExpandRowCell, EditableCell, IdCell, DateCell} from './cells';
import {DataListWrapper} from './dataListWrapper';
import {generateMockResponse} from './testUtils';

describe('Cells', () => {
  let wrapper = null;
  console.error = jest.fn();

  beforeEach(() => {
    // ResetGlobal();
  });

  describe('Header Cell', () => {
    const sortHandler = jest.fn();

    beforeEach(() => {
      wrapper = shallow(<HeaderCell sortDir='ASC' columnKey='col_1' onSortChangeHandler={sortHandler}/>);
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should handle mouseover correctly', () => {
      wrapper.simulate('mouseover');

      expect(wrapper.state().isHover).toBeTruthy();
      wrapper.simulate('mouseleave');

      expect(wrapper.state().isHover).toBeFalsy();
    });
  });

  describe('Select Cell', () => {
    const tagHandler = jest.fn();
    const options = [{value: 'opt1', label: 'Option 1'}, {value: 'opt2', label: 'Option 2'}];
    const data = new DataListWrapper([{col_1: ['tag1']}, {col_2: ['tag2']}], 2, 2);
    const isLoading = {0: true, 1: false};

    beforeEach(() => {
      wrapper = mount(<SelectCell columnKey='col_1' isLoading={isLoading} rowIndex={0}
        options={options} data={data}
        tagChangeHandler={tagHandler}/>);
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should handle click', () => {
      const event = {
        stopPropagation: jest.fn()
      };
      wrapper.find('.select-cell').simulate('click', event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    });

    it('should render select without options and data', () => {
      wrapper = mount(<SelectCell columnKey='col_1' isLoading={isLoading} rowIndex={0}
        options={[]}
        tagChangeHandler={tagHandler}/>);

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('Text Cell', () => {
    const data = new DataListWrapper([{col_1: ['tag1']}, {col_2: ['tag2']}], 2, 2);
    beforeEach(() => {
      wrapper = shallow(<TextCell rowIndex={1} columnKey='col_1' data={data}/>);
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('Expand Row Cell', () => {
    const callback = jest.fn();
    beforeEach(() => {
      wrapper = mount(<ExpandRowCell rowIndex={1} callback={callback}><div>test</div></ExpandRowCell>);
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should call callback function', () => {
      wrapper.find('.fixedDataTableCellLayout_wrap1').simulate('click');

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Date Cell', () => {
    const data = new DataListWrapper([{start_time: '2019-04-01T23:59:59'}], 1, 1);
    beforeEach(() => {
      wrapper = mount(<DateCell rowIndex={0} columnKey='start_time' data={data}/>);
    });

    afterEach(() => {
      React.resetGlobal();
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should convert to correct timezone', async () => {
      wrapper.instance().setGlobal({
        settings: {
          timezone: {
            value: 'America/Los_Angeles'
          }
        }
      });

      wrapper.unmount();
      wrapper = mount(<DateCell rowIndex={0} columnKey='start_time' data={data}/>);

      expect(wrapper.update().find('[test-attr="date-cell"]').at(1).text()).toEqual('2019-04-01T16:59:59');
    });
  });

  describe('Editable Cell', () => {
    const data = new DataListWrapper([{col_1: ['tag1']}, {col_2: ['tag2']}], 2, 2);
    beforeEach(() => {
      wrapper = mount(<EditableCell rowIndex={1} changeHandler={jest.fn()} columnKey='col_1' data={data}/>);
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should handle click', () => {
      const event = {
        stopPropagation: jest.fn()
      };
      wrapper.find('.editable-cell').simulate('click', event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Id Cell', () => {
    let data = null;
    const dataUpdateHandler = jest.fn();
    const rowIndex = 1;
    beforeEach(() => {
      data = new DataListWrapper([{_id: 54}, {_id: 55}], 2, 2);
      wrapper = mount(<IdCell rowIndex={rowIndex} handleDataUpdate={dataUpdateHandler} columnKey='_id' data={data}/>);
    });

    afterEach(() => {
      jest.clearAllMocks();
      // Cleaning up the mess left behind the previous test
      mockAxios.reset();
    });

    it('should render correctly', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should display delete icon when hovered', () => {
      wrapper.find('FixedDataTableCellDefault').simulate('mouseEnter');

      expect(wrapper.update().find('.delete-icon').exists()).toBeTruthy();
      wrapper.find('FixedDataTableCellDefault').simulate('mouseLeave');

      expect(wrapper.find('.delete-icon').exists()).toBeFalsy();
    });

    it('should close confirmation dialog', () => {
      const event = {
        stopPropagation: jest.fn()
      };
      wrapper.find('FixedDataTableCellDefault').simulate('mouseEnter');
      wrapper.find('.delete-icon').at(0).simulate('click', event);
      wrapper.find('[test-attr="close-btn"]').at(1).simulate('click', event);

      expect(event.stopPropagation).toHaveBeenCalledWith();
    });

    describe('should call delete api and handle', () => {
      const event = {
        stopPropagation: jest.fn()
      };
      const artifactsResponse = [{file_id: '5c41711ea9eee738179295aa', name: 'result.pickle'}, {file_id: '5c41711ea9eee738179295ac', name: 'test.svg'}, {file_id: '5c41711ea9eee738179295ae', name: 'output.png'}];
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
      beforeEach(() => {
        wrapper.find('FixedDataTableCellDefault').simulate('mouseEnter');
        wrapper.find('.delete-icon').at(0).simulate('click', event);
        wrapper.find('[test-attr="delete-btn"]').at(1).simulate('click', event);
      });

      it('success for metrics', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 55, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});

        expect(wrapper.state().isDeleteInProgress).toBeTruthy();
        // Even if no metrics are present, a delete will be called on metrics
        // since deletes are idempotent.
        // The second delete is for the Run entry in Runs collection.
        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(2);
        expect(mockAxios.delete.mock.calls[0]).toEqual(['/api/v1/Metrics/', {params: {query: '{"run_id":55}'}}]);
        generateMockResponse(204, 2);
        await tick();

        expect(wrapper.state().isDeleteInProgress).toBeFalsy();
        expect(dataUpdateHandler).toHaveBeenCalledWith(data.getObjectAt(rowIndex)._id);
      });

      it('success for artifacts', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 55, artifacts: artifactsResponse, experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});

        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(4);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['/api/v1/Fs.chunks/', {params: {query: '{"$or":[{"files_id":' +
              '"5c41711ea9eee738179295aa"},{"files_id":"5c41711ea9eee738179295ac"},{"files_id":"5c41711ea9eee738179295ae"}]}'}}]);
        expect(mockAxios.delete.mock.calls[2]).toEqual(['/api/v1/Fs.files/', {params: {query: '{"$or":[{"_id":' +
              '"5c41711ea9eee738179295aa"},{"_id":"5c41711ea9eee738179295ac"},{"_id":"5c41711ea9eee738179295ae"}]}'}}]);
        generateMockResponse(204, 4);
        await tick();

        expect(dataUpdateHandler).toHaveBeenCalledWith(data.getObjectAt(rowIndex)._id);
      });

      it('success for both artifacts and sources', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: sourcesResponse}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 496}, {_id: '5ca6805e11421a04b4ba8b48', count: 247}]});

        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(2);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['/api/v1/Runs/55']);
        generateMockResponse(204, 2);
        await tick();

        expect(dataUpdateHandler).toHaveBeenCalledWith(data.getObjectAt(rowIndex)._id);
      });

      it('success for both artifacts and sources with files', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: sourcesResponse}}});
        mockAxios.mockResponse({status: 200, data: [{_id: '5ca67d6f11421a00e53d49fc', count: 1}, {_id: '5ca6805e11421a04b4ba8b48', count: 1}]});

        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(4);
        expect(mockAxios.delete.mock.calls[1]).toEqual(['/api/v1/Fs.chunks/', {params: {query: '{"$or":[{"files_id":' +
              '"5ca67d6f11421a00e53d49fc"},{"files_id":"5ca6805e11421a04b4ba8b48"}]}'}}]);
        expect(mockAxios.delete.mock.calls[2]).toEqual(['/api/v1/Fs.files/', {params: {query: '{"$or":[{"_id":' +
              '"5ca67d6f11421a00e53d49fc"},{"_id":"5ca6805e11421a04b4ba8b48"}]}'}}]);
        expect(mockAxios.delete.mock.calls[3]).toEqual(['/api/v1/Runs/55']);
        generateMockResponse(204, 4);
        await tick();

        expect(dataUpdateHandler).toHaveBeenCalledWith(data.getObjectAt(rowIndex)._id);
      });

      it('unknown error', async () => {
        mockAxios.mockResponse({status: 200, data: {_id: 54, artifacts: [], experiment: {sources: []}}});
        mockAxios.mockResponse({status: 200, data: []});
        await tick();
        expect(mockAxios.delete).toHaveBeenCalledTimes(2);
        mockAxios.mockResponse({status: 204});
        mockAxios.mockResponse({status: 400});
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
        await tick();
        const errResponse = {status: 500, message: 'unknown error'};
        mockAxios.mockError(errResponse);
        await tick();

        expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
      });
    });
  });
});
