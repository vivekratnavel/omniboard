import PropTypes from 'prop-types'
import React, { Component } from 'react';
import { Alert, Button } from 'react-bootstrap';
import './sourceFilesView.scss';
import axios from 'axios';
import { ProgressWrapper } from '../Helpers/hoc';
import { parseServerError } from '../Helpers/utils';
import {
  Accordion,
  AccordionItem,
  AccordionItemTitle,
  AccordionItemBody,
} from 'react-accessible-accordion';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import { FilePreview } from '../FilePreview/filePreview';

class SourceFilesView extends Component {
  static propTypes = {
    files: PropTypes.array,
    type: PropTypes.string,
    runId: PropTypes.number
  };

  constructor(props) {
    super(props);
    this.state = {
      sourceFiles: {},
      isLoadingSourceFiles: false,
      error: '',
      isZipInProgress: false
    }
  }

  _fetchSourceFiles = () => {
    const {files} = this.props;
    if (files.length) {
      this.setState({
        isLoadingSourceFiles: true,
        error: ''
      });
      const query = {
        '$or': []
      };
      files.forEach(file => {
        query.$or.push({'_id': file.file_id});
      });
      axios.get('/api/v1/Fs.files', {
        params: {
          query,
          populate: 'chunk'
        }
      }).then(response => {
        const sourceFiles = response.data.reduce( (files, file) => {
          const fileName = file.filename.split("/").splice(-1)[0];
          files[fileName] = {
            id: file._id,
            uploadDate: file.uploadDate,
            filename: fileName,
            filepath: file.filename,
            data: file.chunk[0].data
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
    }
  };

  _downloadFile = (fileId, fileName) => {
    return (event) => {
      axios({
        url: '/api/v1/files/' + fileId,
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

  _downloadAllFiles = (event) => {
    const {sourceFiles} = this.state;
    const {type, runId} = this.props;
    const zip = new JSZip();
    if (Object.keys(sourceFiles).length) {
      this.setState({
        isZipInProgress: true
      });
      Object.keys(sourceFiles).forEach(fileName => {
        if (sourceFiles[fileName].data) {
          zip.file(fileName, sourceFiles[fileName].data, {base64: true});
        }
      });
      zip.generateAsync({type: "blob"})
        .then(content => {
          saveAs(content, `${type}-${runId}.zip`);
          this.setState({
            isZipInProgress: false
          });
        });
    } else {
      this.setState({
        error: `Error: No files are available to download`
      });
    }
  };

  componentDidMount() {
    this._fetchSourceFiles();
  }

  render() {
    const {files, type} = this.props;
    const {isLoadingSourceFiles, isZipInProgress, error, sourceFiles} = this.state;

    const errorAlert = error ? <Alert bsStyle="danger">{error}</Alert> : '';
    const warningText = `Oops! There are no ${type} available for this run.`;
    const accordions = <ProgressWrapper loading={isLoadingSourceFiles}>
      <div>
        <div className="download-all-wrapper clearfix">
          <div className="pull-right">
            <Button test-attr="down-all-btn" bsStyle="info" bsSize="small" onClick={this._downloadAllFiles} disabled={isZipInProgress}>
              {isZipInProgress ? <i className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/> : <i className='glyphicon glyphicon-download-alt'/>}
              &nbsp;
              {isZipInProgress ? "Preparing..." : "Download All"}
            </Button>
          </div>
        </div>
        <Accordion accordion={false}>
          {files.map(file =>
            <AccordionItem key={file.name}>
              <AccordionItemTitle className="accordion__title accordion__title--animated">
                <h5 className="u-position-relative">
                  {file.name}
                  <div className="accordion__arrow" role="presentation" />
                </h5>
                <div>{sourceFiles[file.name] && sourceFiles[file.name].filepath}</div>
              </AccordionItemTitle>
              <AccordionItemBody>
                <div className="clearfix">
                  <div className="pull-left upload-date">Upload Date: {sourceFiles[file.name] && sourceFiles[file.name].uploadDate}</div>
                  <div className="pull-right">
                    <Button test-attr={"down-btn-"+file.name} bsStyle="default" bsSize="xsmall" onClick={this._downloadFile(file.file_id, file.name)}>
                      <i className='glyphicon glyphicon-download-alt'/> Download
                    </Button>
                  </div>
                </div>
                <FilePreview fileName={file.name} fileId={file.file_id} sourceFiles={sourceFiles}/>
              </AccordionItemBody>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </ProgressWrapper>;
    const content = files.length > 0 ? accordions : <Alert test-attr="warn-alert" bsStyle="warning">{warningText}</Alert>;
    return(
      <div id="source-files-container">
        {errorAlert}
        {content}
      </div>
    );
  }
}

export {SourceFilesView};
