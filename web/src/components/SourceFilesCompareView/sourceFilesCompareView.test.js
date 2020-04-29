import React from 'react';
import mockAxios from 'jest-mock-axios';
import {toast} from 'react-toastify';
import {SourceFilesCompareView} from './sourceFilesCompareView';

describe('CapturedOutCompareView', () => {
  let wrapper = null;
  const responseData = [
    {
      _id: 1,
      files: [{
        _id: '5ca9ee3be343f70074b6093c',
        md5: 'f26d8b8c9cfeaad76b804120491ab74a',
        chunkSize: 261120,
        length: 15630,
        filename: '/home/test/lvk/src/common.py',
        uploadDate: '2019-04-07T12:34:03.359Z'
      },
      {
        _id: '5caa514ae343f74064d2f4d9',
        uploadDate: '2019-04-07T19:36:42.643Z',
        chunkSize: 261120,
        md5: '47703a0f972d5b074c366acd4d66d5b7',
        filename: '/home/test/lvk/src/descent_curl.py',
        length: 15501
      }]
    }, {
      _id: 2,
      files: [{
        _id: '5ca9ee3be343f70074b6093c',
        md5: 'f26d8b8c9cfeaad76b804120491ab74a',
        chunkSize: 261120,
        length: 15630,
        filename: '/home/test/lvk/src/common.py',
        uploadDate: '2019-04-07T12:34:03.359Z'
      }, {
        _id: '5caa469fe343f73f6081abcd',
        filename: '/home/test/lvk/src/descent_curl.py',
        chunkSize: 261120,
        md5: '986e8596d5bf7889001e0d8b4f386429',
        uploadDate: '2019-04-07T18:51:11.259Z',
        length: 15477
      }, {
        _id: '4vdsgsfgsg',
        filename: '/home/test/test.py',
        chunkSize: 261120,
        md5: '986e8596d5bf7889001e0d8b4f386429',
        uploadDate: '2019-04-07T18:51:11.259Z',
        length: 15477
      }]
    }
  ];
  const files = ['/home/test/lvk/src/common.py', '/home/test/lvk/src/descent_curl.py', '/home/test/test.py'];
  const responseData1 = 'INFO - hello_config\nProgress: 0/100\nProgress: 1/100\n';
  const responseData2 = 'INFO - hello_config_2\nProgress: 10/100\nProgress: 14/100\n';
  const responseData3 = 'INFO - hello_config_3\nProgress: 20/100\nProgress: 74/100\n';
  const responseData4 = 'INFO - hello_config_4\nProgress: 30/100\nProgress: 54/100\n';
  const runIds = [1, 2, 3];
  const dbInfo = {key: 'default', name: 'test_db', path: '/test'};
  toast.error = jest.fn();

  beforeEach(() => {
    wrapper = mount(
      <SourceFilesCompareView isSelected runIds={runIds} dbInfo={dbInfo}/>
    );
  });

  afterEach(() => {
    // Cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
  });

  describe('should load data', () => {
    it('success', async () => {
      expect(mockAxios.get.mock.calls).toHaveLength(1);

      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/SourceFiles', {
        params: {
          query: JSON.stringify({_id: {$in: [1, 2]}})
        }
      }]);

      fetch.once(JSON.stringify({body: responseData1}, {status: 200}));
      fetch.once(JSON.stringify({body: responseData2}, {status: 200}));
      fetch.once(JSON.stringify({body: responseData3}, {status: 200}));
      fetch.once(JSON.stringify({body: responseData4}, {status: 200}));
      mockAxios.mockResponse({status: 200, data: responseData});

      expect(fetch.mock.calls).toHaveLength(4);
      expect(fetch.mock.calls[3][0]).toEqual('/test/api/v1/files/preview/4vdsgsfgsg');
      await tick();
      expect(wrapper.update()).toMatchSnapshot();

      wrapper.instance().setState({
        files
      });
      await tick();
      expect(wrapper.update()).toMatchSnapshot();
    });

    it('error', () => {
      const errResponse = {status: 400, message: 'Not Found'};
      mockAxios.mockError(errResponse);

      expect(toast.error).toHaveBeenCalledWith(`Error: ${errResponse.message}`, {autoClose: 5000});
    });
  });

  it('should not load data when runIds < 2', async () => {
    wrapper.unmount();
    mockAxios.reset();
    wrapper = mount(
      <SourceFilesCompareView isSelected runIds={[1]} dbInfo={dbInfo}/>
    );
    expect(wrapper.instance().state.runId1).toEqual('');
    expect(mockAxios.get.mock.calls).toHaveLength(0);
  });

  it('should handle run id change', async () => {
    mockAxios.mockResponse({status: 200, data: responseData});
    mockAxios.reset();
    wrapper.instance()._handleRunIdChange('runId1')({value: '3'});

    expect(wrapper.instance().state.runId1).toEqual('3');
    expect(mockAxios.get.mock.calls).toHaveLength(1);
    expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/SourceFiles', {
      params: {
        query: JSON.stringify({_id: {$in: [3, 2]}})
      }
    }]);
    mockAxios.mockResponse({status: 200, data: []});
  });

  describe('componentDidUpdate', () => {
    beforeEach(() => {
      mockAxios.mockResponse({status: 200, data: responseData});
      mockAxios.reset();
    });

    it('loads data', async () => {
      wrapper.setProps({runIds: [1, 3, 2]});

      expect(wrapper.instance().state.runId2).toEqual('3');
      expect(mockAxios.get.mock.calls).toHaveLength(1);
      expect(mockAxios.get.mock.calls[0]).toEqual(['api/v1/SourceFiles', {
        params: {
          query: JSON.stringify({_id: {$in: [1, 3]}})
        }
      }]);
      mockAxios.mockResponse({status: 200, data: []});
    });

    it('does not load data', async () => {
      wrapper.setProps({runIds: [1, 2, 3]});

      expect(mockAxios.get.mock.calls).toHaveLength(0);
    });
  });
});
