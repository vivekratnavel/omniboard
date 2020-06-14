import React from 'react';
import mockAxios from 'jest-mock-axios';
import saveAs from 'file-saver';
import {parseServerError} from '../Helpers/utils';
import {SourceFilesView} from './sourceFilesView';

describe('SourceFilesView', () => {
  let wrapper = null;
  const type = 'artifacts';
  const runId = 1;
  const dbInfo = {key: 'default', name: 'test_db', path: '/test'};
  const files = [
    {
      name: '/src/hello_world.py',
      file_id: '5a1bd242ca100c1a210b0d3a'
    }
  ];
  const responseData = [
    {
      _id: '5a1bd242ca100c1a210b0d3a',
      uploadDate: '2017-11-27T08:52:18.562Z',
      md5: '6ef452da81287e70540ee3cf0bffd13e',
      length: 1646,
      chunkSize: 261120,
      filename: '/src/hello_world.py'
    },
    {
      _id: '5a1bd242ca100c1a210b0d3b',
      uploadDate: '2017-11-27T08:53:18.562Z',
      md5: '6ef452da81287e70540ee3cf9bffd13e',
      length: 0,
      chunkSize: 0,
      filename: '/src/hello_world_2.py'
    }
  ];

  beforeEach(() => {
    wrapper = mount(
      <SourceFilesView files={files} runId={runId} dbInfo={dbInfo} type={type}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.state().isLoadingSourceFiles).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: responseData});
    await tick();

    expect(wrapper.state().isLoadingSourceFiles).toBeFalsy();
    expect(wrapper.update()).toMatchSnapshot();
  });

  it('should handle error while fetching source files on mount', async () => {
    const errorResponse = {status: 404, message: 'unknown error'};
    mockAxios.mockError(errorResponse);

    expect(wrapper.state().error).toEqual(parseServerError(errorResponse));
  });

  describe('should download file', () => {
    it('when source exists', async () => {
      const data = '}qXresultqX\fHello world!qs.';
      mockAxios.mockResponse({status: 200, data: responseData});
      await tick();
      wrapper.update().find('[test-attr="acc-item-0"]').at(1).simulate('click');
      wrapper.update().find('[test-attr="down-btn-/src/hello_world.py"]').at(1).simulate('click');
      mockAxios.mockResponse({status: 200, data});
      await tick();

      expect(saveAs).toHaveBeenCalledWith(new Blob([data]), files[0].name);
    });

    it('display error when source does not exist', async () => {
      mockAxios.mockResponse({status: 200, data: []});
      await tick();
      wrapper.update().find('[test-attr="down-btn-/src/hello_world.py"]').at(1).simulate('click');
      const err = {status: 500, message: 'internal server error'};
      mockAxios.mockError(err);
      await tick();

      expect(saveAs).not.toHaveBeenCalled();
      expect(wrapper.state().error).toEqual(parseServerError(err));
    });
  });

  describe('should download all files', () => {
    it('when source exists', async () => {
      const data = '}qXresultqX\fHello world!qs.';
      mockAxios.mockResponse({status: 200, data: responseData});
      await tick();
      wrapper.update().find('[test-attr="down-all-btn"]').at(1).simulate('click');

      expect(wrapper.state().isZipInProgress).toBeTruthy();
      mockAxios.mockResponse({status: 200, data});
      await tick();

      expect(wrapper.state().isZipInProgress).toBeFalsy();
      expect(saveAs).toHaveBeenCalledWith(new Blob([data]), `${type}-${runId}.zip`);
    });

    it('display error when source does not exist', async () => {
      mockAxios.mockResponse({status: 200, data: []});
      await tick();
      wrapper.update().find('[test-attr="down-all-btn"]').at(1).simulate('click');
      await tick();

      expect(saveAs).not.toHaveBeenCalled();
      expect(wrapper.state().error).toEqual('Error: No files are available to download');
    });
  });

  describe('should handle accordion change', () => {
    it('and handle error', async () => {
      const fileId = responseData[0]._id;
      const error = {message: 'errorMessage'};
      mockAxios.mockResponse({status: 200, data: responseData});
      await tick();
      fetch.mockReject(error);
      wrapper.instance()._handleAccordionItemChange(fileId);

      expect(fetch.mock.calls).toHaveLength(1);
      expect(fetch.mock.calls[0][0]).toEqual(`/test/api/v1/files/preview/${fileId}`);

      await tick();

      expect(wrapper.update().state().isAccordionDataLoading).toBeFalsy();
      expect(wrapper.state().accordionError).toEqual(parseServerError(error));
    });
  });

  it('should show warning message when there are no files', async () => {
    wrapper = shallow(
      <SourceFilesView files={[]} runId={1} dbInfo={dbInfo} type='artifacts'/>
    );

    expect(wrapper.find('[test-attr="warn-alert"]')).toHaveLength(1);
  });

  it('should show error message when type is invalid', async () => {
    wrapper = shallow(
      <SourceFilesView files={files} runId={1} dbInfo={dbInfo} type='invalid'/>
    );

    expect(wrapper.find('[test-attr="error-alert"]')).toHaveLength(1);
  });
});
