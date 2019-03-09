import React from 'react';
import RunsTable, { FILTER_OPERATOR_LABELS } from './runsTable';
import mockAxios from 'jest-mock-axios';
import { parseServerError } from '../Helpers/utils';
import { STATUS, PROBABLY_DEAD_TIMEOUT } from '../../constants/status.constants';
import { toast } from "react-toastify";
import {SortTypes} from "../Helpers/cells";

describe('RunsTable', () => {
  let wrapper = null;
  let runsResponse = null;
  const tagsResponse = ["test"],
    metricColumnsResponse = [{"_id":"5b7ef4714232e2d5bec00e2f","name":"pretrain_loss_min","metric_name":"pretrain.train.loss","extrema":"min","__v":0}],
    configColumnsResponse = [
      {"_id":"5c16204663dfd3fe6a193610","name":"batch_size","config_path":"train.batch_size","__v":0},
      {"_id":"5c16ea82bea682411d7c0405","name":"settings_epochs","config_path":"train.settings.epochs","__v":0},
      {"_id":"5c16ebd6bea682411d7c0407","name":"Lr","config_path":"train.lr","__v":0}
    ],
    RealDate = Date,
    constantDate = new Date(2018),
    configColumnModalCloseHandler = jest.fn();
  toast.error = jest.fn();

  beforeEach(async () => {
    wrapper = mount(
      <RunsTable showConfigColumnModal={false} handleConfigColumnModalClose={configColumnModalCloseHandler}/>
    );
    // runsTable deletes certain keys in this data and it produces unexpected results
    // That's why assigning data everytime in "beforeEach" block
    runsResponse = [{"_id":226,"config":{"degree_increment":15,"lr_drop_rate":0.1,"model_name":"vgg16","num_views":12,"resume":null,"random_rotate":false,"pretrain_epochs":5,"comment":"","batch_size":10,"keep_cnn2_lr":false,"method":"max","val_label_csv":null,"seed":577224600,"finetune_learning_rate":0.0002,"random_y_flip":false,"debug":false,"save_images":false,"finetune_layers":12,"dim":227,"gpu_device_ids":[0],"optimizer_name":"SGD","learning_rate":0.00033,"dataset":"train","epochs_per_lr_drop":100,"split_id":2,"cnn1_pretrained":true,"part_name":"waist","random_x_flip":true,"dropout_p":0.4,"random_crop":false,"weight_decay":0.0001,"num_classes":1,"finetune_epochs":150,"run_id":"vgg16-waist-split-2","is_grayscale":false},"format":"MongoObserver-0.7.0","stop_time":"2017-12-09T19:02:33.588Z","command":"main","resources":[],"meta":{"command":"main","options":{"--help":false,"--debug":false,"--sql":null,"UPDATE":["learning_rate=0.00033","degree_increment=15","run_id=vgg16-waist-split-2","batch_size=10","split_id=2","part_name=waist","model_name=vgg16","num_classes=1","finetune_learning_rate=0.0002","num_views=12","dropout_p=0.4","method=max","finetune_epochs=150","gpu_device_ids=[0]"],"--print_config":false,"--enforce_clean":true,"COMMAND":null,"--queue":false,"--name":null,"--mongo_db":"nyabuntu:27017:sacred","help":false,"--pdb":false,"--comment":null,"--file_storage":null,"--beat_interval":null,"with":true,"--capture":null,"--unobserved":false,"--tiny_db":null,"--loglevel":null,"--force":false,"--priority":null}},"status":"COMPLETED","host":{"os":["Linux","Linux-4.4.0-101-generic-x86_64-with-debian-stretch-sid"],"hostname":"ketone","gpus":{"driver_version":"384.90","gpus":[{"persistence_mode":false,"total_memory":11172,"model":"GeForce GTX 1080 Ti"},{"persistence_mode":false,"total_memory":11172,"model":"GeForce GTX 1080 Ti"},{"persistence_mode":false,"total_memory":11167,"model":"GeForce GTX 1080 Ti"}]},"cpu":"AMD Ryzen Threadripper 1950X 16-Core Processor","ENV":{},"python_version":"3.5.3"},"result":null,"experiment":{"base_dir":"/home/sample/test/src","repositories":[{"commit":"19b0eeaeb9487fa83092bafed90c9ef7632f5875","dirty":false,"url":"git@gitlab.com:test/test.git"}],"dependencies":["numpy==1.12.1","sacred==0.7.2","torch==0.2.0.post4"],"mainfile":"train_mvcnn.py","sources":[["config.py","5a2b28fb613551c8336c1ad7"],["data.py","5a290e6cca100c1e26d9b0f2"]],"name":"train_mvcnn"},"start_time":"2017-12-09T03:52:27.032Z","heartbeat":"2017-12-09T19:02:33.590Z","omniboard":{"notes":"testing note!","tags":["tag1","test"]},"metrics":[{"_id":"5a2b5f639c7a505a652f686a","name":"pretrain.train.loss","run_id":226,"timestamps":["2017-12-09T03:58:17.844Z","2017-12-09T04:06:20.027Z","2017-12-09T04:14:22.382Z","2017-12-09T04:22:20.467Z","2017-12-09T04:30:18.968Z"],"values":[0.5324579061182472,0.2914960329687301,0.23130620609884442,0.20769643091361042,0.16022304643890112],"steps":[0,1,2,3,4]},{"_id":"5a2b5f819c7a505a652f68a0","name":"pretrain.val.loss","run_id":226,"timestamps":["2017-12-09T03:58:52.649Z","2017-12-09T04:06:54.233Z","2017-12-09T04:14:55.985Z","2017-12-09T04:22:54.501Z","2017-12-09T04:30:53.225Z"],"values":[0.5495098043664547,0.49541433053454015,0.3766315503759878,0.32450790044486005,0.34349719718795324],"steps":[0,1,2,3,4]}]}, {"_id":222,"config":{"batch_size":10,"dropout_p":0.4,"comment":"","random_y_flip":false,"epochs_per_lr_drop":100,"optimizer_name":"SGD","finetune_epochs":150,"random_crop":false,"lr_drop_rate":0.1,"degree_increment":30,"resume":null,"finetune_layers":12,"model_name":"vgg16","debug":false,"val_label_csv":null,"dim":227,"weight_decay":0.0001,"seed":166636088,"is_grayscale":false,"finetune_learning_rate":0.0002,"keep_cnn2_lr":false,"pretrain_epochs":5,"part_name":"arms","gpu_device_ids":[0],"random_rotate":false,"random_x_flip":true,"run_id":"vgg16-arms-cog-split-2","dataset":"train","num_classes":2,"learning_rate":0.00033,"method":"cog","cnn1_pretrained":true,"split_id":2,"num_views":12,"save_images":false},"result":null,"format":"MongoObserver-0.7.0","heartbeat":"2017-12-09T14:08:02.176Z","stop_time":"2017-12-09T14:08:02.175Z","status":"COMPLETED","start_time":"2017-12-09T03:33:38.375Z","meta":{"options":{"--tiny_db":null,"--comment":null,"--enforce_clean":false,"UPDATE":["split_id=2","finetune_learning_rate=0.0002","model_name=vgg16","num_classes=2","degree_increment=30","num_views=12","dropout_p=0.4","part_name=arms","learning_rate=0.00033","method=cog","run_id=vgg16-arms-cog-split-2","batch_size=10","finetune_epochs=150","gpu_device_ids=[0]"],"--sql":null,"--pdb":false,"help":false,"--file_storage":null,"--beat_interval":null,"--debug":false,"--mongo_db":"sacred","--queue":false,"--print_config":false,"--capture":null,"--name":null,"COMMAND":null,"--loglevel":null,"--priority":null,"--help":false,"with":true,"--unobserved":false,"--force":false},"command":"main"},"resources":[],"host":{"hostname":"nyabuntu","ENV":{},"python_version":"3.5.3","gpus":{"gpus":[{"persistence_mode":false,"model":"GeForce GTX 1080 Ti","total_memory":11172},{"persistence_mode":false,"model":"GeForce GTX 1080 Ti","total_memory":11172},{"persistence_mode":false,"model":"TITAN X (Pascal)","total_memory":12188}],"driver_version":"384.90"},"os":["Linux","Linux-4.4.0-103-generic-x86_64-with-debian-stretch-sid"],"cpu":"Intel(R) Core(TM) i7-6850K CPU @ 3.60GHz"},"experiment":{"sources":[["config.py","5a2aeaffca100c076c7fa525"],["data.py","5a290e6cca100c1e26d9b0f2"]],"mainfile":"train_mvcnn.py","repositories":[{"dirty":true,"url":"git@gitlab.com:test/test.git","commit":"8bd4f6e8765376f4ad01cce8c285f9563bc19512"}],"dependencies":["numpy==1.12.1","sacred==0.7.2","torch==0.2.0.post4"],"base_dir":"/home/sample/test/src","name":"train_mvcnn"},"command":"main","omniboard":{"notes":"notes for 222","tags":["tag1","test1"]},"metrics":[{"_id":"5a2b5a8c9c7a505a652f6127","name":"pretrain.train.loss","run_id":222,"values":[0.7159541824544438,0.3840367944955761,0.3469185283233073,0.30483262065173106,0.28915774130337507],"steps":[0,1,2,3,4],"timestamps":["2017-12-09T03:37:44.425Z","2017-12-09T03:41:54.414Z","2017-12-09T03:46:01.766Z","2017-12-09T03:50:07.365Z","2017-12-09T03:54:12.560Z"]},{"_id":"5a2b5aa09c7a505a652f6146","name":"pretrain.val.loss","run_id":222,"values":[0.32177006650114165,0.23237958704995795,0.23340759051386187,0.21925230575196739,0.20541178824900605],"steps":[0,1,2,3,4],"timestamps":["2017-12-09T03:38:01.945Z","2017-12-09T03:42:11.673Z","2017-12-09T03:46:18.843Z","2017-12-09T03:50:24.377Z","2017-12-09T03:54:29.752Z"]}]}];
    global.Date = class extends RealDate {
      constructor(dateString) {
        super();
        return dateString ? new RealDate(dateString) : constantDate;
      }
    };
    await tick();
  });

  afterEach(() => {
    // cleaning up the mess left behind the previous test
    mockAxios.reset();
    jest.clearAllMocks();
    global.Date = RealDate;
    // reset localStorage
    /* eslint-disable no-global-assign */
    localStorage.clear();
  });

  it('should render', async () => {
    expect(wrapper.state().isTableLoading).toBeTruthy();
    mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: configColumnsResponse});
    await tick();

    expect(wrapper.state().isTableLoading).toBeFalsy();
    expect(wrapper.update()).toMatchSnapshot();
  });

  it('should open add remove metric columns modal', () => {
    wrapper.find('#add_remove_metric_columns').at(1).simulate('click');

    expect(wrapper.state().showMetricColumnModal).toBeTruthy();
    wrapper.find('[test-attr="close-btn"]').at(1).simulate('click');

    expect(wrapper.state().showMetricColumnModal).toBeFalsy();
  });

  describe('should load data', async () => {
    const getAPIArguments = (queryString) => {
      return ['/api/v1/Runs', {
        params: {
          select: '_id,heartbeat,experiment,command,host,stop_time,config,' +
            'result,start_time,resources,format,status,omniboard,metrics,meta',
          sort: '-_id',
          query: queryString,
          populate: {
            match: {
              name: {
                $in: [
                  "pretrain.train.loss"
                ],
              },
            },
            path: "metrics",
          }
        }
      }]
    };

    it('with status filter query', async () => {
      let queryString = {};

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments(queryString));
      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => ['running']
        }
      };
      queryString = JSON.stringify({'$and': [{'$or': [{'status': {'$eq': 'running'}}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments(queryString));
    });

    it('with status filter as running', async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => [STATUS.RUNNING]
        }
      };
      const heartbeatTimeout = constantDate - PROBABLY_DEAD_TIMEOUT;
      const queryString = JSON.stringify({'$and': [{'$or': [{'$and': [{'status': STATUS.RUNNING}, {'heartbeat': `>${heartbeatTimeout}`}]}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments(queryString));
    });

    it('with status filter as probably_dead', async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      mockAxios.reset();
      wrapper.instance().statusFilterDomNode = {
        $multiselect: {
          val: () => [STATUS.PROBABLY_DEAD]
        }
      };
      const heartbeatTimeout = constantDate - PROBABLY_DEAD_TIMEOUT;
      const queryString = JSON.stringify({'$and': [{'$or': [{'$and': [{'status': STATUS.RUNNING}, {'heartbeat': `<${heartbeatTimeout}`}]}]}]});
      wrapper.instance()._handleStatusFilterChange({});

      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      expect(mockAxios.get.mock.calls[1]).toEqual(getAPIArguments(queryString));
    });

    it('the second time when other states are retrieved from local storage', async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      wrapper.instance().loadData();
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();

      expect(wrapper.state().isTableLoading).toBeFalsy();
    })
  });

  it('should initialize empty note with comment', async() => {
    runsResponse = [{"_id":226,"config":{"degree_increment":15,"lr_drop_rate":0.1,"model_name":"vgg16","num_views":12,"resume":null,"random_rotate":false,"pretrain_epochs":5,"comment":"","batch_size":10,"keep_cnn2_lr":false,"method":"max","val_label_csv":null,"seed":577224600,"finetune_learning_rate":0.0002,"random_y_flip":false,"debug":false,"save_images":false,"finetune_layers":12,"dim":227,"gpu_device_ids":[0],"optimizer_name":"SGD","learning_rate":0.00033,"dataset":"train","epochs_per_lr_drop":100,"split_id":2,"cnn1_pretrained":true,"part_name":"waist","random_x_flip":true,"dropout_p":0.4,"random_crop":false,"weight_decay":0.0001,"num_classes":1,"finetune_epochs":150,"run_id":"vgg16-waist-split-2","is_grayscale":false},"format":"MongoObserver-0.7.0","stop_time":"2017-12-09T19:02:33.588Z","command":"main","resources":[],"meta":{"command":"main","comment":"test comment"},"status":"COMPLETED","result":null,"heartbeat":"2017-12-09T19:02:33.590Z","metrics":[]}];
    mockAxios.mockResponse({status: 200, data: []});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: []});
    await tick();

    expect(wrapper.state().data[0].notes).toEqual('test comment');
  });

  describe('should handle errors correctly', () => {
    describe('for error in initial load', async () => {
      const errResponse = {status: 500, message:'unknown error'};
      it('metrics response', async () => {
        mockAxios.mockError(errResponse);
        await tick();

        expect(wrapper.state().isError).toBeTruthy();
        expect(wrapper.state().errorMessage).toEqual(parseServerError(errResponse));
      });

      it('runs response', async () => {
        mockAxios.mockResponse({status: 200, data: []});
        await tick();

        mockAxios.mockError(errResponse);
        mockAxios.mockResponse({status: 200, data: tagsResponse});
        mockAxios.mockResponse({status: 200, data: configColumnsResponse});
        await tick();

        expect(wrapper.state().isError).toBeTruthy();
        expect(wrapper.state().errorMessage).toEqual(parseServerError(errResponse));
      });
    });
  });

  it('should expand row correctly', async () => {
    mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: configColumnsResponse});
    await tick();
    wrapper.update().find('[test-attr="cell-row_expander-0"]').simulate('click');

    expect(wrapper.state().expandedRows).toContain(0);
    expect(wrapper.state().scrollToRow).toEqual(0);
    // Clicking on an expanded row should collapse it
    wrapper.find('[test-attr="cell-row_expander-0"]').simulate('click');

    expect(wrapper.state().expandedRows.size).toEqual(0);
    expect(wrapper.state().scrollToRow).toBeNull();
  });

  describe('should handle tag change correctly', () => {
    const rowIndex = 0;
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();

      wrapper.instance()._handleTagChange(rowIndex)([{value: 'tag1'}, {value: 'tag2'}]);
    });

    it('for error response', () => {
      const errResponse = {status: 500, request: {}};

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeTruthy();
      mockAxios.mockError(errResponse);

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeFalsy();
      expect(wrapper.state().tags).not.toContain('tag1');
      expect(toast.error).toHaveBeenCalledWith('Error: No response was received from the server.');
    });

    it('for success response', () => {
      expect(mockAxios.put).toHaveBeenCalledWith('/api/v1/Runs/' + runsResponse[rowIndex]._id, {
        omniboard: {
          tags: ['tag1','tag2']
        }
      });

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeTruthy();
      mockAxios.mockResponse({status: 200});

      expect(wrapper.state().isSelectLoading[rowIndex]).toBeFalsy();
      expect(wrapper.state().tags).toContain('tag1');
      expect(wrapper.state().tags).toContain('tag2');
      expect(wrapper.state().sortedData.getObjectAt(rowIndex).tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('should handle notes change correctly', () => {
    const rowIndex = 0;
    const notes = 'test notes';

    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();

      wrapper.instance()._handleNotesChange(rowIndex)('name', notes);
    });

    it('for error response', () => {
      const errResponse = {status: 500, message: 'unknown error'};
      mockAxios.mockError(errResponse);

      expect(toast.error).toHaveBeenCalledWith(parseServerError(errResponse));
    });

    it('for success response', () => {
      expect(mockAxios.put).toHaveBeenCalledWith('/api/v1/Runs/' + runsResponse[rowIndex]._id, {
        omniboard: {
          notes
        }
      });
      mockAxios.mockResponse({status: 200});

      expect(wrapper.state().sortedData.getObjectAt(rowIndex).notes).toEqual(notes);
    });
  });

  describe('should handle delete experiment run', () => {
    let runId = 222;
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();
    });

    it('when run is present', () => {
      expect(wrapper.state().data.filter(item => item._id === runId)).toHaveLength(1);
      wrapper.instance()._handleDeleteExperimentRun(runId);

      expect(wrapper.state().data.filter(item => item._id === runId)).toHaveLength(0);
    });

    it('when run is present and sort enabled', () => {
      runId = runsResponse[0]._id;
      wrapper.setState({
        sort: {
          _id: SortTypes.DESC
        }
      }, () => {
        wrapper.update().instance()._handleDeleteExperimentRun(runId);
      });

      expect(wrapper.state().data.filter(item => item._id === runId)).toHaveLength(0);
      expect(wrapper.state().sortedData.getObjectAt(0)._id).toEqual(runsResponse[1]._id);
    });

    it('when run is not present', () => {
      runId = 100;
      const dataLength = wrapper.state().data.length;
      wrapper.instance()._handleDeleteExperimentRun(runId);

      expect(wrapper.state().data).toHaveLength(dataLength);
    });
  });

  it('should handle sort change correctly', async () => {
    mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: configColumnsResponse});
    await tick();

    const event = {
      preventDefault: jest.fn()
    };
    wrapper.update().find('[test-attr="header-sort-_id"]').simulate('click', event);

    expect(event.preventDefault).toHaveBeenCalledWith();
    expect(wrapper.state().sort['_id']).toEqual('DESC');
    expect(wrapper.state().sortedData.getObjectAt(0)._id).toEqual(226);
    wrapper.update().find('[test-attr="header-sort-_id"]').simulate('click', event);

    expect(wrapper.state().sort['_id']).toEqual('ASC');
    expect(wrapper.state().sortedData.getObjectAt(0)._id).toEqual(222);
  });

  describe('should handle column show/hide correctly', () => {
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();
    });

    afterEach(() => {
      wrapper.setState({
        dropdownOptions: []
      });
    });

    it('when close button is clicked in header', () => {
      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeTruthy();
      wrapper.update().find('[test-attr="header-_id"]').at(1).simulate('mouseover');
      wrapper.update().find('[test-attr="header-sort-close-_id"]').simulate('click', '_id');

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeFalsy();
      expect(wrapper.state().columnOrder).not.toContain('_id');
    });

    it('when a column is checked/unchecked in show/hide columns', () => {
      wrapper.instance().showHideColumnsDomNode = {
        $multiselect: {
          val: () => ['start_time', 'heartbeat', 'stop_time']
        }
      };

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeTruthy();
      wrapper.instance()._handleDropdownChange({});

      expect(wrapper.state().dropdownOptions.find(option => option.value === '_id').selected).toBeFalsy();
      expect(wrapper.state().columnOrder).not.toContain('_id');
      expect(wrapper.state().columnOrder).toHaveLength(3);
      expect(wrapper.state().dropdownOptions.find(option => option.value === 'start_time').selected).toBeTruthy();
    });
  });

  describe('should handle column reorder correctly', () => {
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();
    });

    it('when columnAfter is present', () => {
      const event = {
        reorderColumn: 'notes',
        columnAfter: '_id'
      };
      wrapper.instance()._onColumnReorderEndCallback(event);
      const indexReorderColumn = wrapper.state().columnOrder.indexOf(event.reorderColumn);

      expect(wrapper.state().columnOrder[indexReorderColumn + 1]).toEqual(event.columnAfter);
      expect(wrapper.state().dropdownOptions[indexReorderColumn + 1].value).toEqual(event.columnAfter);
    });

    it('when columnAfter is not present', () => {
      const event = {
        reorderColumn: 'heartbeat'
      };
      wrapper.instance()._onColumnReorderEndCallback(event);
      const indexReorderColumn = wrapper.state().columnOrder.indexOf(event.reorderColumn);

      expect(indexReorderColumn).toEqual(wrapper.state().columnOrder.length - 1);
      expect(wrapper.state().dropdownOptions[indexReorderColumn].value).toEqual(event.reorderColumn);
    });
  });

  it('should handle metric column delete correctly', async () => {
    mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
    await tick();

    mockAxios.mockResponse({status: 200, data: runsResponse});
    mockAxios.mockResponse({status: 200, data: tagsResponse});
    mockAxios.mockResponse({status: 200, data: configColumnsResponse});
    await tick();
    wrapper.instance()._handleColumnDelete('_id');

    expect(wrapper.state().columnOrder.indexOf('_id')).toEqual(-1);
    expect(wrapper.state().dropdownOptions.indexOf('_id')).toEqual(-1);
    expect(Object.keys(wrapper.state().columnWidths).indexOf('_id')).toEqual(-1);
  });

  describe('should add or remove filters', () => {
    beforeEach(async () => {
      mockAxios.mockResponse({status: 200, data: metricColumnsResponse});
      await tick();

      mockAxios.mockResponse({status: 200, data: runsResponse});
      mockAxios.mockResponse({status: 200, data: tagsResponse});
      mockAxios.mockResponse({status: 200, data: configColumnsResponse});
      await tick();
    });

    afterEach(() => {
      wrapper.setState({
        filters: {
          status: [],
          advanced: []
        },
        filterColumnName: '',
        filterColumnOperator: '$eq',
        filterColumnValue: ''
      });
    });

    it('should add filter', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      mockAxios.mockResponse({status: 200, data: []});
      await tick();
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$eq'});
      wrapper.find('[test-attr="filter-column-value"]').at(1).prop('onChange')({value: 'host1'});
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filters.advanced[0].value).toEqual('host1');
      expect(wrapper.state().filters.advanced[0].name).toEqual('host.hostname');
      expect(wrapper.state().filterColumnName).toEqual('');
      expect(wrapper.state().filterColumnOperator).toEqual('$eq');
      expect(wrapper.state().filterColumnValue).toEqual('');
      expect(wrapper.find('.tags-container').find('.item').find('.tag').at(0).text()).toEqual(`Hostname ${FILTER_OPERATOR_LABELS['$eq']} host1`);
    });

    it('should add filter with $in operator', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: []});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});
      wrapper.find('[test-attr="filter-column-value"]').at(1).prop('onChange')([{value: 'host1'}, {value: 'host2'}]);
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filters.advanced[0].value).toEqual(['host1', 'host2']);
      expect(wrapper.state().filters.advanced[0].name).toEqual('host.hostname');
      expect(wrapper.state().filterColumnName).toEqual('');
      expect(wrapper.state().filterColumnOperator).toEqual('$eq');
      expect(wrapper.state().filterColumnValue).toEqual('');
      expect(wrapper.find('.tags-container').find('.item').find('.tag').at(0).text()).toEqual(`Hostname ${FILTER_OPERATOR_LABELS['$in']} host1,host2`);
    });

    it('should handle add filter errors', async() => {
      expect(wrapper.state().filterColumnNameError).toBeFalsy();
      expect(wrapper.state().filterColumnValueError).toBeFalsy();
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.state().filterColumnNameError).toBeTruthy();
      expect(wrapper.state().filterColumnValueError).toBeFalsy();
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      wrapper.find('#add_filter').at(1).simulate('click');

      expect(wrapper.update().state().filterColumnNameError).toBeFalsy();
      expect(wrapper.state().filterColumnValueError).toBeTruthy();
    });

    it('should load value dropdown options', async() => {
      const response = ["host1", "host2"];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      await tick();
      const expectedOptions = response.map(value => { return {label: value, value} });
      const dropdownOptions = wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options;

      expect(dropdownOptions).toEqual(expectedOptions);
    });

    it('should load value dropdown options for status', async() => {
      const response = ["completed", "interrupted"];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'status'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      await tick();
      const expectedOptions = response.map(value => { return {label: value, value} });
      expectedOptions.push({label: STATUS.PROBABLY_DEAD, value: STATUS.PROBABLY_DEAD});
      const dropdownOptions = wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options;

      expect(dropdownOptions).toEqual(expectedOptions);
    });

    it('should change value dropdown to multiselect', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().isMulti).toBeFalsy();

      mockAxios.mockResponse({status: 200, data: ["host1", "host2"]});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().isMulti).toBeTruthy();
    });

    it('value dropdown should allow multiple values', async() => {
      const response = ["host1", "host2"];
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 200, data: response});
      wrapper.find('[test-attr="filter-column-operator-dropdown"]').at(1).prop('onChange')({value: '$in'});
      wrapper.update().find('[test-attr="filter-column-value"]').at(1).prop('onChange')([{value: 'host1'}, {value: 'host2'}]);
      const expectedValues = response.map(value => { return {label: value, value} });

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().value).toEqual(expectedValues);
    });

    it('should handle value dropdown options error', async() => {
      wrapper.find('[test-attr="filter-column-name-dropdown"]').at(1).prop('onChange')({value: 'host.hostname'});
      await tick();
      mockAxios.mockResponse({status: 400});

      expect(wrapper.update().find('[test-attr="filter-column-value"]').at(1).props().options).toHaveLength(0);
    });

    it('should remove a filter', async() => {
      wrapper.setState({
        filterColumnName: '_id',
        filterColumnOperator: '$gt',
        filterColumnValue: '7',
      });
      wrapper.instance()._handleAddFilterClick();
      wrapper.setState({
        filterColumnName: 'bool',
        filterColumnOperator: '$eq',
        filterColumnValue: 'true',
      });
      wrapper.instance()._handleAddFilterClick();

      expect(wrapper.update().state().filters.advanced).toHaveLength(2);
      expect(wrapper.state().filters.advanced[0].value).toEqual('7');
      wrapper.update().find('.tags-container').find('.item').at(0).find('.is-delete').simulate('click');

      expect(wrapper.update().state().filters.advanced).toHaveLength(1);
      expect(wrapper.state().filters.advanced[0].value).toEqual('true');
    });
  });
});
