import React from 'react';
import EditableTextArea from './editableTextArea';

describe('EditableTextArea', () => {
  let wrapper = null;
  const updateHandler = jest.fn();

  beforeEach(() => {
    wrapper = mount(
      <EditableTextArea value='test note' className='text-area' cols={50}
        rows={50} name='text-area-name'
        id='text_area_id' onUpdate={updateHandler}/>
    );
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.find('[test-attr="edit-button"]').simulate('click');

    expect(wrapper.update()).toMatchSnapshot();
    expect(wrapper.state().isEditing).toBeTruthy();
  });

  it('should handle save correctly', () => {
    wrapper.find('[test-attr="edit-button"]').simulate('click');
    const event = {
      preventDefault: jest.fn()
    };
    wrapper.instance().save(event);

    expect(event.preventDefault).toHaveBeenCalledWith();
    const value = wrapper.update().find('#text_area_id').text();

    expect(updateHandler).toHaveBeenCalledWith('text-area-name', value);
  });

  it('should handle cancel correctly', () => {
    wrapper.instance().cancel({});

    expect(wrapper.state().isEditing).toBeFalsy();
  });

  it('should handle props updates correctly', () => {
    const updatedValue = 'updated notes';
    wrapper.setProps({value: updatedValue});

    expect(wrapper.state().value).toEqual(updatedValue);
  });
});
