import mockAxios from 'jest-mock-axios';

export const generateMockResponse = (status, times) => {
  for (let i = 0; i < times; i++) {
    mockAxios.mockResponse({status});
  }
};
