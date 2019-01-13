import React from 'react';
import {TextCell, SelectCell, HeaderCell, ExpandRowCell, EditableCell, IdCell} from './cells';
import { DataListWrapper } from './dataListWrapper';
import { toast } from "react-toastify";
import mockAxios from 'jest-mock-axios';

describe('Cells', () => {
  let wrapper = null;
  /* eslint-disable no-console */
  console.error = jest.fn();

  describe('Header Cell', () => {
    const sortHandler = jest.fn();

    beforeEach(() => {
      wrapper = shallow(<HeaderCell sortDir={"ASC"} columnKey={"col_1"} onSortChangeHandler={sortHandler}/>);
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
    const tagHandler = jest.fn(),
      options = [{value: 'opt1', label: 'Option 1'}, {value: 'opt2', label: 'Option 2'}],
      data = new DataListWrapper([0,1], [{col_1: ['tag1']}, {col_2: ['tag2']}]),
      isLoading = {0:true, 1:false};

    beforeEach(() => {
      wrapper = mount(<SelectCell columnKey={"col_1"} isLoading={isLoading} rowIndex={0} options={options} data={data}
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
      wrapper = mount(<SelectCell columnKey={"col_1"} isLoading={isLoading} rowIndex={0} options={[]}
                                  tagChangeHandler={tagHandler}/>);

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('Text Cell', () => {
    const data = new DataListWrapper([0,1], [{col_1: ['tag1']}, {col_2: ['tag2']}]);
    beforeEach(() => {
      wrapper = shallow(<TextCell rowIndex={1} columnKey={"col_1"} data={data}/>);
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

  describe('Editable Cell', () => {
    const data = new DataListWrapper([0,1], [{col_1: ['tag1']}, {col_2: ['tag2']}]);
    beforeEach(() => {
      wrapper = mount(<EditableCell rowIndex={1} changeHandler={jest.fn()} columnKey={'col_1'} data={data}/>);
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
    const data = new DataListWrapper([0,1], [{_id: 54}, {_id: 55}]);
    const dataUpdateHandler = jest.fn();
    const rowIndex = 1;
    beforeEach(() => {
      wrapper = mount(<IdCell rowIndex={rowIndex} handleDataUpdate={dataUpdateHandler} columnKey={'_id'} data={data}/>);
    });

    afterEach(() => {
      jest.clearAllMocks();
      // cleaning up the mess left behind the previous test
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
      toast.error = jest.fn();
      beforeEach(() => {
        wrapper.find('FixedDataTableCellDefault').simulate('mouseEnter');
        wrapper.find('.delete-icon').at(0).simulate('click', event);
        wrapper.find('[test-attr="delete-btn"]').at(1).simulate('click', event);
      });

      it('success', () => {
        mockAxios.mockResponse({status: 204});

        expect(dataUpdateHandler).toHaveBeenCalledWith(data.getObjectAt(rowIndex)._id);
      });

      it('unknown error', () => {
        mockAxios.mockResponse({status: 200});

        expect(toast.error).toHaveBeenCalledWith(`An unknown error occurred!`);
      });

      it('error', () => {
        const errResponse = {status: 500, message:'unknown error'};
        mockAxios.mockError(errResponse);

        expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`);
      });
    });
  });
});
