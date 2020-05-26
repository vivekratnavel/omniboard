import React, {PureComponent} from 'react';
import {tomorrow} from 'react-syntax-highlighter/styles/prism';
import PropTypes from 'prop-types';
import SyntaxHighlighter, {registerLanguage} from 'react-syntax-highlighter/prism-light';
import json from 'react-syntax-highlighter/languages/prism/json';
import python from 'react-syntax-highlighter/languages/prism/python';
import {Alert} from 'react-bootstrap';
import Iframe from 'react-iframe';
import {ProgressWrapper} from '../Helpers/hoc';
import {FILE_PREVIEW_LIMIT} from '../SourceFilesView/sourceFilesView';
import {getFileExtension} from '../Helpers/utils';
import {imageExtensions} from './imageExtensions';

registerLanguage('json', json);
registerLanguage('python', python);

const getLanguageFromFileName = fileName => {
  const languageMapping = {
    py: 'python',
    json: 'json'
  };
  const extension = fileName.split('.').splice(-1)[0];
  return languageMapping[extension] || '';
};

class FilePreview extends PureComponent {
  static propTypes = {
    fileName: PropTypes.string.isRequired,
    sourceFiles: PropTypes.object.isRequired,
    fileId: PropTypes.string.isRequired,
    isLoading: PropTypes.bool.isRequired,
    errorMessage: PropTypes.string,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired
  };

  render() {
    const {fileName, sourceFiles, fileId, errorMessage, isLoading, dbInfo} = this.props;
    const extension = getFileExtension(fileName);
    const fileInfo = sourceFiles[fileId];
    const isFileTooLarge = fileInfo && fileInfo.fileLength && fileInfo.fileLength > FILE_PREVIEW_LIMIT;
    const warningMessage = `File is too large to be previewed. Only files less than ${FILE_PREVIEW_LIMIT / 1024 / 1024}MB can be previewed.`;
    const formattedFilePreview = () => {
      if (isFileTooLarge) {
        return (<Alert bsStyle='warning'>{warningMessage}</Alert>);
      }

      const pathPrefix = dbInfo.path ? `${dbInfo.path}/` : '';
      if (imageExtensions.includes(extension) && fileId) {
        const imgSource = `${pathPrefix}api/v1/files/download/${fileId}/${fileName}`;
        return (<img src={imgSource} alt='image'/>);
      }

      // Render html in iframe
      if (extension === 'html') {
        return (
          <Iframe
            url={`${pathPrefix}api/v1/files/preview/${fileId}/${fileName}`}
            width='100%'
            height='1000px'
          />
        );
      }

      if (fileInfo && fileInfo.data) {
        return (<SyntaxHighlighter language={getLanguageFromFileName(fileName)} style={tomorrow}>{fileInfo.data}</SyntaxHighlighter>);
      }

      return null;
    };

    return (
      <div>
        <ProgressWrapper loading={isLoading}>
          {
            errorMessage ?
              <Alert bsStyle='danger'>{errorMessage}</Alert> :
              formattedFilePreview()
          }
        </ProgressWrapper>
      </div>
    );
  }
}

export {FilePreview, getLanguageFromFileName};
