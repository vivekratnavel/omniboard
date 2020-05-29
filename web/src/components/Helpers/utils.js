
export const capitalize = value => {
  // Capitalize each word
  let split = value.split('_');
  split = split.map(key => {
    if (key.length > 0) {
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

export const arrayDiff = (arr1, arr2) => arr1.filter(i => !arr2.includes(i));

export const arrayDiffColumns = (arr1, arr2) => arr1.filter(item => !arr2.some(i => i.name === item.name && i.value === item.value));

export const headerText = header => {
  return capitalize(header);
};

export const parseServerError = error => {
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

export const getFileExtension = fileName => fileName.split('.').splice(-1)[0];

/**
 * Creates a new ArrayBuffer from concatenating two existing ones
 *
 * @param {ArrayBuffer | null} buffer1 The first buffer.
 * @param {ArrayBuffer | null} buffer2 The second buffer.
 * @return {ArrayBuffer | null} The new ArrayBuffer created out of the two.
 */
export const concatArrayBuffers = (buffer1, buffer2) => {
  if (!buffer1) {
    return buffer2;
  }

  if (!buffer2) {
    return buffer1;
  }

  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

export const resolveObjectPath = (object, path, defaultValue) =>
  path.split('.').reduce((o, p) => o && Object.prototype.hasOwnProperty.call(o, p) ? o[p] : defaultValue, object);

export const getAllPaths = (prefix, data, excludeObjectType = false) => {
  return Object.keys(data).reduce((paths, key) => {
    const newPath = prefix ? `${prefix}.${key}` : key;
    if (!excludeObjectType || typeof data[key] !== 'object') {
      paths = [...paths, newPath];
    }

    if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key]) {
      const newPaths = Object.keys(data[key]).reduce((acc, item) => {
        if (typeof data[key][item] !== 'object' && data[key][item]) {
          acc.push(`${newPath}.${item}`);
        }

        return acc;
      }, []);
      const recursivePaths = getAllPaths(newPath, data[key], excludeObjectType);
      return [...paths, ...recursivePaths, ...newPaths];
    }

    return paths;
  }, []);
};

export const getOption = (value, options) => {
  return options.find(option => option.value === value);
};
