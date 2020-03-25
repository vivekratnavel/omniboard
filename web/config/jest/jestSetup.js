import Enzyme, {shallow, render, mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

// React 16 Enzyme adapter
Enzyme.configure({adapter: new Adapter()});

// Make Enzyme functions available in all test files without importing
global.shallow = shallow;
global.render = render;
global.mount = mount;
global.fetch = require('jest-fetch-mock');

// From Stack Overflow
// https://stackoverflow.com/questions/37408834/testing-with-reacts-jest-and-enzyme-when-simulated-clicks-call-a-function-that
// Author: https://stackoverflow.com/users/562883/jonathan-stray
// Helper function returns a promise that resolves after all other promise mocks,
// even if they are chained like Promise.resolve().then(...)
// Technically: this is designed to resolve on the next macrotask
global.tick = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
};

global.console = {
  warn: jest.fn() // The console.warn statements are ignored in tests
};

// Workaround to resolve "TypeError: window.URL.createObjectURL is not a function" thrown by plotly.js
const noOp = () => {};
if (typeof window.URL.createObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'createObjectURL', {value: noOp});
}
