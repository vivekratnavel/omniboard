import React, { PureComponent } from "react";
import { imageExtensions } from "./imageExtensions";
import { tomorrow } from 'react-syntax-highlighter/styles/prism';
import PropTypes from 'prop-types'
import SyntaxHighlighter, { registerLanguage } from "react-syntax-highlighter/prism-light";
import json from 'react-syntax-highlighter/languages/prism/json';
import python from 'react-syntax-highlighter/languages/prism/python';

registerLanguage('json', json);
registerLanguage('python', python);

const getLanguageFromFileName = (fileName) => {
  const languageMapping = {
    'py': 'python',
    'json': 'json'
  };
  const extension = fileName.split(".").splice(-1)[0];
  return languageMapping[extension] || '';
};

class FilePreview extends PureComponent {
  static propTypes = {
    fileName: PropTypes.string,
    sourceFiles: PropTypes.object,
    fileId: PropTypes.string
  };

  render() {
    const {fileName, sourceFiles, fileId} = this.props;
    const extension = fileName.split('.').splice(-1)[0];

    if (imageExtensions.includes(extension) && fileId) {
      let imgSource = `/api/v1/files/${fileId}`;
      if (extension === 'svg' && sourceFiles[fileName]) {
        imgSource = `data:image/svg+xml;base64,${sourceFiles[fileName].data}`;
      }
      return (<img src={imgSource} />);
    }
    return (
        <SyntaxHighlighter language={getLanguageFromFileName(fileName)} style={tomorrow}>
          {sourceFiles[fileId] && atob(sourceFiles[fileId].data)}
        </SyntaxHighlighter>
        );
  }
}

export {FilePreview, getLanguageFromFileName};
