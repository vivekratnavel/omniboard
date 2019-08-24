
export const DRILLDOWN_VIEW = {
  EXPERIMENT: 'experiment',
  RUN_INFO: 'run_info',
  META_INFO: 'meta_info',
  HOST_INFO: 'host_info',
  METRICS: 'metrics',
  CAPTURED_OUT: 'captured_out',
  ARTIFACTS: 'artifacts',
  SOURCE_FILES: 'source_files',
  CONFIG: 'config',
  FAIL_TRACE: 'fail_trace'
};

export const X_AXIS_VALUE = {
  STEPS: 'steps',
  TIME: 'timestamps'
};

export const SCALE_VALUE = {
  LINEAR: 'linear',
  LOGARITHMIC: 'logarithmic'
};

export const X_AXIS_VALUES = [X_AXIS_VALUE.STEPS, X_AXIS_VALUE.TIME];
export const SCALE_VALUES = [SCALE_VALUE.LINEAR, SCALE_VALUE.LOGARITHMIC];
