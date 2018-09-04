class DataListWrapper {
  constructor(indexMap = [], data = []) {
    this._indexMap = indexMap;
    this._data = data;
  }

  getSize() {
    return this._indexMap.length;
  }

  getObjectAt(index) {
    return this._data[this._indexMap[index]];
  }

  getDataArray() {
    return this._data;
  }

  getIndexArray() {
    return this._indexMap;
  }

  setObjectAt(index, value) {
    this._data[this._indexMap[index]] = value;
  }
}

export {DataListWrapper};