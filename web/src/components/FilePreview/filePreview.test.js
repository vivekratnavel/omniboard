import React from 'react';
import {FILE_PREVIEW_LIMIT} from '../SourceFilesView/sourceFilesView';
import {FilePreview, getLanguageFromFileName} from './filePreview';

describe('FilePreview', () => {
  let wrapper = null;
  const sourceFiles = {
    1: {
      data: 'Hello World!'
    },
    3: {
      data: 'svg_image'
    },
    4: {
      data: 'png_image'
    },
    5: {
      data: '',
      fileLength: FILE_PREVIEW_LIMIT + 1
    },
    6: {
      data: ''
    }
  };

  const dbInfo = {key: 'test', name: 'sacred', path: '/db1'};

  beforeEach(() => {
    wrapper = shallow(
      <FilePreview fileId='1' fileName='hello_world.py' sourceFiles={sourceFiles} isLoading={false} dbInfo={dbInfo}/>
    );
  });

  describe('should render correctly', () => {
    it('text files', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('svg files', () => {
      wrapper = shallow(
        <FilePreview fileId='3' fileName='test.svg' sourceFiles={sourceFiles} isLoading={false} dbInfo={dbInfo}/>
      );

      expect(wrapper).toMatchSnapshot();
    });

    it('image files', () => {
      wrapper = shallow(
        <FilePreview fileId='4' fileName='output.png' sourceFiles={sourceFiles} isLoading={false} dbInfo={dbInfo}/>
      );

      expect(wrapper).toMatchSnapshot();
    });

    it('when file size is too large', () => {
      wrapper = shallow(
        <FilePreview fileId='5' fileName='out.txt' sourceFiles={sourceFiles} isLoading={false} dbInfo={dbInfo}/>
      );

      expect(wrapper).toMatchSnapshot();
    });

    it('when there is error', () => {
      wrapper = shallow(
        <FilePreview fileId='6' fileName='out.txt' sourceFiles={sourceFiles} errorMessage='error' isLoading={false} dbInfo={dbInfo}/>
      );

      expect(wrapper).toMatchSnapshot();
    });

    it('html files', () => {
      wrapper = shallow(
        <FilePreview fileId='7' fileName='output.html' sourceFiles={sourceFiles} isLoading={false} dbInfo={dbInfo}/>
      );

      expect(wrapper).toMatchSnapshot();
    });
  });

  it('should map language from filename correctly', () => {
    let fileName = 'abc.py';

    expect(getLanguageFromFileName(fileName)).toEqual('python');
    fileName = 'unknown.abc';

    expect(getLanguageFromFileName(fileName)).toEqual('');
  });
});
