import React from 'reactn';
import { SettingsModal } from './settingsModal';
import mockAxios from 'jest-mock-axios';
import { toast } from 'react-toastify';
import { parseServerError } from "../Helpers/utils";

describe('SettingsModal', () => {
  let wrapper = null;
  const closeHandler = jest.fn(() => wrapper.setProps({show: false}));
  toast.success = jest.fn();

  beforeEach(() => {
    wrapper = shallow(
      <SettingsModal handleClose={closeHandler} show={true}/>
    );
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should disable submit when any setting is empty', () => {
    wrapper.setState({settings: {timezone: {value: ''}}});

    expect(wrapper.instance().isSubmitDisabled).toBeTruthy();
  });

  it('should detect correctly if form is dirty', () => {
    wrapper.setState({settings: {timezone: {value: 'Atlantic'}},
      initialSettings: {timezone: {value: 'Atlantic/Reykjavik'}}});

    expect(wrapper.instance().isSubmitDisabled).toBeFalsy();
    expect(wrapper.instance().isFormDirty).toBeTruthy();
  });

  describe('should handle', () => {
    const newTimezone = 'America/Los_Angeles';
    beforeEach(() => {
      wrapper.setState({
        settings: {
          timezone: {
            value: 'Atlantic/Reykjavik',
            id: 1
          }
        },
        initialSettings: {
          timezone: {
            value: 'Atlantic/Reykjavik',
            id: 1
          }
        }
      });
      wrapper.find('[test-attr="timezone-select"]').simulate('change', {value: newTimezone});
      wrapper.find('[test-attr="apply-btn"]').simulate('click');
    });

    it('setting change', () => {
      expect(wrapper.update().state().settings.timezone.value).toEqual(newTimezone);
    });

    it('save success', async () => {
      expect(wrapper.state().isInProgress).toBeTruthy();
      wrapper.instance().setGlobal = jest.fn();
      mockAxios.mockResponse({status: 200});

      await tick();

      expect(wrapper.state().isInProgress).toBeFalsy();
      expect(wrapper.instance().setGlobal).toHaveBeenCalledWith({
        settings: {
          timezone: {
            value: newTimezone,
            id: 1
          }
        }
      });

      expect(toast.success).toHaveBeenCalledWith(`Settings saved successfully!`);
    });

    it('save error', async () => {
      const err = {status: 400, response: {data: {message: 'cannot save'}}};
      mockAxios.mockError(err);

      await tick();

      expect(wrapper.state().error).toEqual(parseServerError(err));
    });

    it('save error - bad format', async () => {
      const err = {status: 400, response: {data: {message: 'cannot save'}}};
      mockAxios.mockResponse(err);

      await tick();

      expect(wrapper.state().error).toEqual(parseServerError(err));
    });

    it('save when form is not dirty', async () => {
      mockAxios.mockResponse({status: 400});
      wrapper.find('[test-attr="timezone-select"]').simulate('change', {value: 'Atlantic/Reykjavik'});
      wrapper.find('[test-attr="apply-btn"]').simulate('click');

      expect(wrapper.state().error).toEqual('There are no changes to be applied');
    });
  });

  it('should initialize state when modal dialog is reopened', () => {
    wrapper.setState({
      settings: {
        timezone: {
          value: 'Atlantic/Reykjavik',
          id: 1
        }
      },
      initialSettings: {
        timezone: {
          value: 'Atlantic/Reykjavik',
          id: 1
        }
      }
    });
    wrapper.find('[test-attr="close-btn"]').simulate('click');

    wrapper.setProps({ show: true });

    expect(wrapper.update().state().settings).toEqual(undefined);
  });
});
