
export const DRILLDOWN_VIEW = {
  EXPERIMENT: 'experiment',
  RUN_INFO: 'run_info',
  META_INFO: 'meta_info',
  HOST_INFO: 'host_info',
  METRICS: 'metrics',
  CAPTURED_OUT: 'captured_out'
};

export const X_AXIS_VALUE = {
  STEPS: 'steps',
  TIME : 'timestamps'
};

export const SCALE_VALUE = {
  LINEAR:'linear',
  LOGARITHMIC:'logarithmic'
};

export const xAxisValues = [X_AXIS_VALUE.STEPS, X_AXIS_VALUE.TIME];
export const scaleValues = [SCALE_VALUE.LINEAR, SCALE_VALUE.LOGARITHMIC];
