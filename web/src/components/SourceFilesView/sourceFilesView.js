import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Alert, Button} from 'react-bootstrap';
import './sourceFilesView.scss';
import ReactList from 'react-list';
import {
  Accordion,
  AccordionItem,
  AccordionItemTitle,
  AccordionItemBody
} from 'react-accessible-accordion';
import saveAs from 'file-saver';
import backend, {setDbInfo} from '../Backend/backend';
import {ProgressWrapper} from '../Helpers/hoc';
import {concatArrayBuffers, getFileExtension, parseServerError} from '../Helpers/utils';
import {imageExtensions} from '../FilePreview/imageExtensions';
import {FilePreview} from '../FilePreview/filePreview';

const MIN_ACCORDION_HEIGHT = 51;

// File preview limit set to 5MB in bytes
const FILE_PREVIEW_LIMIT = 5242880;

class SourceFilesView extends Component {
  static propTypes = {
    files: PropTypes.array.isRequired,
    type: PropTypes.string.isRequired,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired,
    runId: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      sourceFiles: {},
      isLoadingSourceFiles: false,
      error: '',
      isZipInProgress: false,
      isAccordionDataLoading: false,
      accordionError: ''
    };
  }

  _fetchSourceFiles = () => {
    const {runId, type} = this.props;
    if (runId && ['source_files', 'artifacts'].includes(type)) {
      this.setState({
        isLoadingSourceFiles: true,
        error: ''
      });
      let url = '';
      if (type === 'source_files') {
        url = `api/v1/files/source/${runId}`;
      } else if (type === 'artifacts') {
        url = `api/v1/files/artifacts/${runId}`;
      }

      backend.get(url).then(response => {
        const sourceFiles = response.data.reduce((files, file) => {
          files[file._id] = {
            id: file._id,
            uploadDate: file.uploadDate,
            filepath: file.filename,
            fileLength: file.length,
            chunkSize: file.chunkSize
          };
          return files;
        }, {});
        this.setState({
          sourceFiles,
          isLoadingSourceFiles: false,
          error: ''
        });
      }).catch(error => {
        const message = parseServerError(error);
        this.setState({
          isLoadingSourceFiles: false,
          error: message
        });
      });
    } else {
      this.setState({
        error: 'Invalid run id or type.'
      });
    }
  };

  _downloadFile = (fileId, fileName) => {
    return _event => {
      backend({
        url: `api/v1/files/download/${fileId}/${fileName}`,
        method: 'GET',
        responseType: 'blob'
      }).then(response => {
        saveAs(new Blob([response.data]), fileName);
      }).catch(error => {
        const message = parseServerError(error);
        this.setState({
          error: message
        });
      });
    };
  };

  _downloadAllFiles = _event => {
    const {sourceFiles} = this.state;
    const {type, runId} = this.props;
    if (Object.keys(sourceFiles).length > 0) {
      this.setState({
        isZipInProgress: true
      });
      backend({
        url: `api/v1/files/downloadAll/${runId}/${type}`,
        method: 'GET',
        responseType: 'blob'
      }).then(response => {
        this.setState({
          isZipInProgress: false
        });
        saveAs(new Blob([response.data]), `${type}-${runId}.zip`);
      }).catch(error => {
        const message = parseServerError(error);
        this.setState({
          isZipInProgress: false,
          error: message
        });
      });
    } else {
      this.setState({
        error: 'Error: No files are available to download'
      });
    }
  };

  componentDidMount() {
    setDbInfo(backend, this.props.dbInfo);
    this._fetchSourceFiles();
  }

  _handleAccordionItemChange = fileId => {
    const {sourceFiles} = this.state;
    const {files} = this.props;
    const fileInfo = files.find(file => file.file_id === fileId);
    const fileName = fileInfo.name || '';
    this.setState({
      accordionError: ''
    });
    if (sourceFiles[fileId] && !sourceFiles[fileId].data && sourceFiles[fileId].fileLength <= FILE_PREVIEW_LIMIT &&
        !imageExtensions.includes(getFileExtension(fileName))) {
      // Fetch contents of artifact/source file
      this.setState({
        isAccordionDataLoading: true
      });

      fetch(`${backend.defaults.baseURL}/api/v1/files/preview/${fileId}`)
        .then(response => {
          // Response body is a ReadableStream
          const reader = response.body.getReader();
          // Result is concatenated Array Buffer
          let result = null;
          const onStreamDone = () => {
            // Convert array buffer to string
            const resultText = new TextDecoder().decode(result);
            const updatedFileInfo = {...sourceFiles[fileId], data: resultText};
            this.setState(prevState => {
              return {
                sourceFiles: {...prevState.sourceFiles, [fileId]: updatedFileInfo},
                isAccordionDataLoading: false
              };
            });
          };

          reader.read().then(function processText({done, value}) {
            // Result objects contain two properties:
            // done  - true if the stream has already given you all its data.
            // value - some data. Always undefined when done is true.
            if (done) {
              onStreamDone();
              return;
            }

            // Concatenate array buffer
            result = concatArrayBuffers(result, value);

            // Read some more, and call this function again
            return reader.read().then(processText);
          });
        }).catch(error => {
          this.setState({
            isAccordionDataLoading: false,
            accordionError: parseServerError(error)
          });
        });
    }
  };

  _itemSizeEstimator = (_index, _cache) => {
    return MIN_ACCORDION_HEIGHT;
  };

  _renderAccordionItem = index => {
    const {files} = this.props;
    const {sourceFiles, accordionError, isAccordionDataLoading} = this.state;
    const file = files[index];
    return (
      <AccordionItem key={file.file_id} uuid={file.file_id} test-attr={'acc-item-' + index}>
        <AccordionItemTitle className='accordion__title accordion__title--animated'>
          <h5 className='u-position-relative'>
            {file.name}
            <div className='accordion__arrow' role='presentation'/>
          </h5>
          <div>{sourceFiles[file.file_id] && sourceFiles[file.file_id].filepath}</div>
        </AccordionItemTitle>
        <AccordionItemBody>
          <div className='clearfix'>
            <div className='pull-left upload-date'>Upload Date: {sourceFiles[file.file_id] && sourceFiles[file.file_id].uploadDate}</div>
            <div className='pull-right'>
              <Button test-attr={'down-btn-' + file.name} bsStyle='default' bsSize='xsmall' onClick={this._downloadFile(file.file_id, file.name)}>
                <i className='glyphicon glyphicon-download-alt'/> Download
              </Button>
            </div>
          </div>
          <FilePreview fileName={file.name} fileId={file.file_id} sourceFiles={sourceFiles}
            isLoading={isAccordionDataLoading} errorMessage={accordionError} dbInfo={this.props.dbInfo}/>
        </AccordionItemBody>
      </AccordionItem>
    );
  };

  render() {
    const {files, type} = this.props;
    const {isLoadingSourceFiles, isZipInProgress, error} = this.state;

    const errorAlert = error ? <Alert bsStyle='danger' test-attr='error-alert'>{error}</Alert> : '';
    const warningText = `Oops! There are no ${type} available for this run.`;
    const accordions = (
      <ProgressWrapper loading={isLoadingSourceFiles}>
        <div>
          <div className='download-all-wrapper clearfix'>
            <div className='pull-right'>
              <Button test-attr='down-all-btn' bsStyle='info' bsSize='small' disabled={isZipInProgress} onClick={this._downloadAllFiles}>
                {isZipInProgress ? <i className='glyphicon glyphicon-refresh glyphicon-refresh-animate'/> : <i className='glyphicon glyphicon-download-alt'/>}
              &nbsp;
                {isZipInProgress ? 'Archiving...' : 'Download All'}
              </Button>
            </div>
          </div>
          <Accordion accordion onChange={this._handleAccordionItemChange}>
            <ReactList
              itemRenderer={this._renderAccordionItem}
              length={files.length}
              type='variable'
              minSize={20}
              pageSize={10}
              threshold={300}
              itemSizeEstimator={this._itemSizeEstimator}
            />
          </Accordion>
        </div>
      </ProgressWrapper>
    );
    const content = files.length > 0 ? accordions : <Alert test-attr='warn-alert' bsStyle='warning'>{warningText}</Alert>;
    return (
      <div id='source-files-container'>
        {errorAlert}
        {content}
      </div>
    );
  }
}

export {SourceFilesView, FILE_PREVIEW_LIMIT};
