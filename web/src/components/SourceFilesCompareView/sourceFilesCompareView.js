import React, {Component} from 'react';
import PropTypes from 'prop-types';
import './sourceFilesCompareView.scss';
import {toast} from 'react-toastify';
import ReactDiffViewer from 'react-diff-viewer';
import {
  Accordion,
  AccordionItem,
  AccordionItemTitle,
  AccordionItemBody
} from 'react-accessible-accordion';
import backend, {setDbInfo} from '../Backend/backend';
import {SelectRunsToCompare} from '../SelectRunsToCompare/selectRunsToCompare';
import {concatArrayBuffers, parseServerError} from '../Helpers/utils';
import {ProgressWrapper} from '../Helpers/hoc';

// File diff preview limit set to 2MB
const FILE_DIFF_PREVIEW_LIMIT = 2097152;

class SourceFilesCompareView extends Component {
  static propTypes = {
    runIds: PropTypes.arrayOf(Number).isRequired,
    isSelected: PropTypes.bool.isRequired,
    dbInfo: PropTypes.shape({
      path: PropTypes.string,
      key: PropTypes.string
    }).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      sourceFiles1: [],
      sourceFiles2: [],
      files: [],
      runId1: '',
      runId2: '',
      isLoading: false
    };
  }

  _initializeState = () => {
    const {runIds, isSelected} = this.props;
    this.setState({
      runId1: String(runIds[0]),
      runId2: String(runIds[1])
    }, () => {
      if (isSelected) {
        this._loadData();
      }
    });
  };

  componentDidMount() {
    const {runIds, dbInfo} = this.props;
    setDbInfo(backend, dbInfo);
    if (runIds && runIds.length >= 2) {
      this._initializeState();
    }
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    // Populate runId options every time runIds change
    const {runIds} = this.props;
    if (JSON.stringify(prevProps.runIds) !== JSON.stringify(runIds) && runIds.length >= 2) {
      this._initializeState();
    }
  }

  _handleRunIdChange = runId => {
    return selectedOption => {
      this.setState({
        [runId]: selectedOption.value
      }, this._loadData);
    };
  };

  _loadData = () => {
    let {runId1, runId2} = this.state;
    runId1 = Number(runId1);
    runId2 = Number(runId2);
    if (runId1 > 0 && runId2 > 0) {
      this.setState({
        isLoading: true
      });
      const queryString = JSON.stringify({
        _id: {
          $in: [runId1, runId2]
        }
      });
      backend.get('api/v1/SourceFiles', {
        params: {
          query: queryString
        }
      })
        .then(sourceFilesResponse => {
          const sourceFilesResponseData = sourceFilesResponse.data;
          // Response data is of the following structure
          // [{
          // "_id": 14,
          // "files": [
          //   {
          //     "_id": "5d7dd1d78a7890626b22c0ad",
          //     "filename": "/Documents/sacred_experiment/hello.py",
          //     "md5": "6d74add03dc5d3471f788074f23697cc",
          //     "chunkSize": 261120,
          //     "length": 2253,
          //     "uploadDate": "2019-09-15T05:53:27.110Z"
          //   },
          //   ...
          // ]
          // }]
          const sourceFilesResponse1 = sourceFilesResponseData.find(data => data._id === runId1);
          const sourceFilesResponse2 = sourceFilesResponseData.find(data => data._id === runId2);
          let sourceFiles1 = sourceFilesResponse1 ? sourceFilesResponse1.files : [];
          let sourceFiles2 = sourceFilesResponse2 ? sourceFilesResponse2.files : [];
          const filesToFetch = [...new Set(sourceFiles1.filter(file => file.length <= FILE_DIFF_PREVIEW_LIMIT).concat(
            sourceFiles2.filter(file => file.length <= FILE_DIFF_PREVIEW_LIMIT)
          ).map(file => file._id))];
          const fileContents = {};
          const promises = filesToFetch.map(fileId => {
            return new Promise((resolve, reject) => {
              fetch(`${backend.defaults.baseURL}/api/v1/files/preview/${fileId}`)
                .then(response => {
                  // Response body is a ReadableStream
                  const reader = response.body.getReader();
                  // Result is concatenated Array Buffer
                  let result = new ArrayBuffer(0);
                  const onStreamDone = () => {
                    // Convert array buffer to string
                    fileContents[fileId] = new TextDecoder().decode(result);
                  };

                  reader.read().then(function processText({done, value}) {
                    // Result objects contain two properties:
                    // done  - true if the stream has already given you all its data.
                    // value - some data. Always undefined when done is true.
                    if (done) {
                      onStreamDone();
                      resolve();
                      return;
                    }

                    // Concatenate array buffer
                    result = concatArrayBuffers(result, value);

                    // Read some more, and call this function again
                    return reader.read().then(processText);
                  });
                }).catch(error => {
                  toast.error(parseServerError(error), {autoClose: 5000});
                  reject(parseServerError(error));
                });
            });
          });

          Promise.all(promises).then(_ => {
            const addData = file => {
              const data = file._id in fileContents ? fileContents[file._id] : '';
              return {...file, data};
            };

            sourceFiles1 = sourceFiles1.map(addData);
            sourceFiles2 = sourceFiles2.map(addData);
            // Store list of all files in lexicographical order
            const filenameMapper = file => file.filename;
            const files = [...(new Set(sourceFiles1.map(filenameMapper).concat(sourceFiles2.map(filenameMapper))))].sort();
            this.setState({
              sourceFiles1,
              sourceFiles2,
              files,
              isLoading: false
            });
          }).catch(error => {
            toast.error(error, {autoClose: 5000});
          });
        })
        .catch(error => {
          toast.error(parseServerError(error), {autoClose: 5000});
        });
    }
  };

  _renderAccordionItem = index => {
    const {sourceFiles1, sourceFiles2, files} = this.state;
    const currentFile = files[index];
    let source1 = sourceFiles1.find(file => file.filename === currentFile) || '';
    source1 = source1 && 'data' in source1 ? source1.data : '';
    let source2 = sourceFiles2.find(file => file.filename === currentFile) || '';
    source2 = source2 && 'data' in source2 ? source2.data : '';

    return (
      <AccordionItem key={currentFile} expanded uuid={currentFile} test-attr={'acc-item-' + index}>
        <AccordionItemTitle className='accordion__title accordion__title--animated'>
          <h5 className='u-position-relative'>
            {currentFile}
            <div className='accordion__arrow' role='presentation'/>
          </h5>
        </AccordionItemTitle>
        <AccordionItemBody>
          {(source1.length > 0 || source2.length > 0) ?
            <ReactDiffViewer splitView oldValue={source1} newValue={source2}/> :
            <div className='text-center'>Diffs of large files cannot be rendered (or file is empty).</div>}
        </AccordionItemBody>
      </AccordionItem>
    );
  };

  render() {
    const {runIds} = this.props;
    const {runId1, runId2, files, isLoading} = this.state;

    return (
      <div className='captured-out-compare-view'>
        <SelectRunsToCompare runIds={runIds} runId1={runId1} runId2={runId2} callback={this._handleRunIdChange}/>
        <ProgressWrapper loading={isLoading}>
          <Accordion accordion={false}>
            {files.map((_, index) => this._renderAccordionItem(index))}
          </Accordion>
        </ProgressWrapper>
      </div>
    );
  }
}

export {SourceFilesCompareView};
