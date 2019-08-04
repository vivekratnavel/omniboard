class DataListWrapper {
  constructor(data = [], size, fetchCallback) {
    this._data = data;
    // When fetching we need to fetch the index missing + additional x-elements.
    // This specifies that we add 10% of the total size when fetching, the
    // maximum number of data-requests will then be 10.
    this._fetchSize = DataListWrapper._getFetchSize(size);
    this._end = 50;
    this._pending = false;
    this._size = size;
    this._fetchCallback = fetchCallback;
  }

  static _getFetchSize(size) {
    return isNaN(size) ? 0 : Math.ceil(Number(size) / 10);
  }

  getSize() {
    return this._size;
  }

  fetchRange(end) {
    if (this._pending) {
      return;
    }

    this._pending = true;
    this._fetchCallback(end)
      .then(({data, count}) => {
        this._pending = false;
        this._end = end;
        this._size = count;
        this._data = data;
        this._fetchSize = DataListWrapper._getFetchSize(count);
      })
      .catch(error => {
        this._pending = false;
        /* eslint-disable no-console */
        console.error(error);
      });
  }

  getObjectAt(index) {
    if (index >= this._end) {
      this.fetchRange(Math.min(this.getSize(),
        index + this._fetchSize));
      return null;
    }

    return this._data[index];
  }

  getDataArray() {
    return this._data;
  }

  setObjectAt(index, value) {
    this._data[index] = value;
  }

  set data(value) {
    this._data = value;
  }
}

export {DataListWrapper};