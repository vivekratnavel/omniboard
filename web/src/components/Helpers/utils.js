import {PROBABLY_DEAD_TIMEOUT, STATUS} from "../../constants/status.constants";

export const capitalize = (value) => {
  // Capitalize each word
  let split = value.split('_');
  split = split.map(key => {
    if (key.length) {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    return '';
  });
  return split.join(' ');
};

export const reorderArray = (array, insertAfter, value) => {
  const insertAfterIndex = array.indexOf(insertAfter);
  const valueIndex = array.indexOf(value);
  if (valueIndex >= 0) {
    array.splice(valueIndex, 1);
    array.splice(insertAfterIndex + 1, 0, value);
  }
};

export const arrayDiff = (arr1, arr2) => {
  return arr1.filter(i => arr2.indexOf(i) < 0);
};

export const headerText = (header) => {
  return capitalize(header);
};

export const parseServerError = (error) => {
  const defaultMessage = 'Error: ';
  let message = '';
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    message = error.response.data.message;
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    message = 'No response was received from the server.';
  } else {
    // Something happened in setting up the request that triggered an Error
    message = error.message;
  }
  return defaultMessage + message;
};

export const getRunStatus = (status, heartbeat) => {
  return status === STATUS.RUNNING && heartbeat && (new Date() - new Date(heartbeat) > PROBABLY_DEAD_TIMEOUT) ? STATUS.PROBABLY_DEAD : status;
};
