// ./__mocks__/axios.js
import mockAxios from 'jest-mock-axios';

mockAxios.all = jest.fn( (urls) => {
  return Promise.all(urls);
});

mockAxios.spread = jest.fn( callback => {
  return (responseArray) => {
    callback.apply(null, responseArray);
  }
});

export default mockAxios;
