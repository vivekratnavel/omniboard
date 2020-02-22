import React from 'reactn';
import mockAxios from 'jest-mock-axios';
import {TextCell, SelectCell, HeaderCell, ExpandRowCell, EditableCell, IdCell, DateCell} from './cells';
import {DataListWrapper} from './dataListWrapper';

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
    const deleteHandler = jest.fn(_experimentIds => jest.fn);
    const rowIndex = 1;
    beforeEach(() => {
      data = new DataListWrapper([{_id: 54}, {_id: 55}], 2, 2);
      wrapper = mount(<IdCell rowIndex={rowIndex} handleDelete={deleteHandler} columnKey='_id' data={data}/>);
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

    it('should call delete handler', () => {
      const event = {
        stopPropagation: jest.fn()
      };
      wrapper.find('FixedDataTableCellDefault').simulate('mouseEnter');
      wrapper.find('.delete-icon').at(0).simulate('click', event);

      expect(deleteHandler).toBeCalledWith([55]);
      expect(event.stopPropagation).toHaveBeenCalledWith();
    });
  });
});
