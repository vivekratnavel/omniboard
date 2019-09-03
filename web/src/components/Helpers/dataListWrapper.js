class DataListWrapper {
  constructor(data = [], size, end, fetchCallback) {
    this._data = data;
    // When fetching we need to fetch the index missing + additional x-elements.
    // This specifies that we add 10% of the total size when fetching, the
    // maximum number of data-requests will then be 10.
    this._fetchSize = DataListWrapper._getFetchSize(size);
    this._end = end;
    this._pending = false;
    this._size = size;
    this._fetchCallback = fetchCallback;
  }

  static _getFetchSize(size) {
    return isNaN(size) ? 0 : Math.ceil(Number(size) / 10);
  }

  getSize() {
    return this._size || 0;
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
        console.error(error);
      });
  }

  getObjectAt(index) {
    // Fetch data 15 rows ahead of end.
    // This will improve user experience such that the user
    // will not see pending status for a long time.
    const numRowsAhead = 15;
    if (index + numRowsAhead >= this._end && this._end < this.getSize()) {
      this.fetchRange(Math.min(this.getSize(),
        index + numRowsAhead + this._fetchSize));
      return index < this._end ? this._data[index] : null;
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
