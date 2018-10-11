// ./__mocks__/jszip.js

export const mockFile = jest.fn();
export const mockGenerateAsync = jest.fn(() => Promise.resolve("test"));

const mock = jest.fn().mockImplementation(() => {
  return {
    file: mockFile,
    generateAsync: mockGenerateAsync
  };
});

export default mock;
