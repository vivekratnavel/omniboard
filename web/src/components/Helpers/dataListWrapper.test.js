import {DataListWrapper} from './dataListWrapper';

describe('DataListWrapper', () => {
  console.error = jest.fn();
  const fetchCallback = jest.fn(end => {
    return new Promise(resolve => {
      const data = [];
      for (let i = 1; i <= end; i++) {
        data.push(i);
      }

      const response = {
        data,
        count: 10
      };
      const callback = () => {
        resolve(response);
      };

      setTimeout(callback, 0);
    });
  });
  const fetchCallbackReject = jest.fn(_end => {
    return new Promise((resolve, reject) => {
      const callback = () => {
        reject(new Error('test error'));
      };

      setTimeout(callback, 0);
    });
  });

  it('should fetch new data when requested index > end', async () => {
    const data = new DataListWrapper([1, 2, 3, 4, 5, 6], 10, 6, fetchCallback);
    data.getObjectAt(0);
    data.getObjectAt(1);
    expect(fetchCallback).toHaveBeenCalledTimes(1);
    expect(fetchCallback).toHaveBeenCalledWith(10);
    await tick();

    expect(data.getDataArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should handle errors while fetching data', async () => {
    const data = new DataListWrapper([1, 2, 3, 4, 5, 6], 10, 6, fetchCallbackReject);
    data.getObjectAt(6);
    expect(fetchCallbackReject).toHaveBeenCalledWith(10);
    await tick();

    expect(console.error).toHaveBeenCalledWith(new Error('test error'));
  });
});
