import React from 'react';
import { SourceFilesView } from './sourceFilesView';
import mockAxios from 'jest-mock-axios';
import { parseServerError } from '../Helpers/utils';
import saveAs from 'file-saver';
import { mockFile, mockGenerateAsync } from '../../../__mocks__/jszip';

describe('SourceFilesView', () => {
  let wrapper = null;
  const files = [
    {
      name: "hello_world.py",
      file_id: "5a1bd242ca100c1a210b0d3a"
    }
  ];
  const responseData = [
    {
      "_id": "5a1bd242ca100c1a210b0d3a",
      "uploadDate": "2017-11-27T08:52:18.562Z",
      "md5": "6ef452da81287e70540ee3cf0bffd13e",
      "length": 1646,
      "chunkSize": 261120,
      "filename": "/src/hello_world.py",
      "chunk": [
        {
          "_id": "5a1bd242ca100c1a210b0d3b",
          "data": "SGVsbG8gV29ybGQh",
          "n": 0,
          "files_id": "5a1bd242ca100c1a210b0d3a"
        }
      ]
    },
    {
      "_id": "5a1bd242ca100c1a210b0d3b",
      "uploadDate": "2017-11-27T08:53:18.562Z",
      "md5": "6ef452da81287e70540ee3cf9bffd13e",
      "length": 0,
      "chunkSize": 0,
      "filename": "/src/hello_world_2.py",
      "chunk": [
        {
          "_id": "5a1bd242ca100c1a210b0d3c",
          "data": "",
          "n": 0,
          "files_id": "5a1bd242ca100c1a210b0d3b"
        }
      ]
    }
  ];

  beforeEach(() => {
    wrapper = shallow(
      <SourceFilesView files={files} runId={1} type="artifacts"/>
    );
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
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

  describe('should download file', async () => {
    it('when source exists', async () => {
      mockAxios.mockResponse({status: 200, data: responseData});
      await tick();
      wrapper.update().find('[test-attr="down-btn-hello_world.py"]').simulate('click');
      mockAxios.mockResponse({status: 200, data: responseData[0].chunk[0].data});
      await tick();

      expect(saveAs).toHaveBeenCalledWith(new Blob([responseData[0].chunk[0].data]), files[0].name);
    });

    it('display error when source does not exist', async () => {
      mockAxios.mockResponse({status: 200, data: []});
      await tick();
      wrapper.update().find('[test-attr="down-btn-hello_world.py"]').simulate('click');
      const err = {status: 500, message: 'internal server error'};
      mockAxios.mockError(err);
      await tick();

      expect(saveAs).not.toHaveBeenCalled();
      expect(wrapper.state().error).toEqual(parseServerError(err));
    });
  });

  describe('should download all files', async () => {
    it('when source exists', async () => {
      mockAxios.mockResponse({status: 200, data: responseData});
      await tick();
      wrapper.update().find('[test-attr="down-all-btn"]').simulate('click');

      expect(wrapper.state().isZipInProgress).toBeTruthy();
      await tick();

      expect(mockFile).toHaveBeenCalledWith(files[0].name, responseData[0].chunk[0].data, {"base64": true});
      expect(mockGenerateAsync).toHaveBeenCalledWith({"type": "blob"});
      expect(wrapper.state().isZipInProgress).toBeFalsy();
      // "test" comes from mock implementation of the module in __mocks__/jszip.js
      expect(saveAs).toHaveBeenCalledWith('test', 'artifacts-1.zip');
    });

    it('display error when source does not exist', async () => {
      mockAxios.mockResponse({status: 200, data: []});
      await tick();
      wrapper.update().find('[test-attr="down-all-btn"]').simulate('click');
      await tick();

      expect(saveAs).not.toHaveBeenCalled();
      expect(wrapper.state().error).toEqual("Error: No files are available to download");
    });
  });

  it('should show warning message when there are no files', async () => {
    wrapper = shallow(
      <SourceFilesView files={[]} runId={1} type="artifacts"/>
    );

    expect(wrapper.find('[test-attr="warn-alert"]')).toHaveLength(1);
  });

});
