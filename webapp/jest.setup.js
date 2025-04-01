const fetchMock = require('jest-fetch-mock');
const ResizeObserver = require('resize-observer-polyfill');

// Extiende jest-dom
require('@testing-library/jest-dom');

// Habilita mocks para fetch
fetchMock.enableMocks();

// Resetea mocks antes de cada test
beforeEach(() => {
  fetchMock.resetMocks();
});

// Mock para scrollIntoView en entornos donde `window` está definido
if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// Polyfill para ResizeObserver
global.ResizeObserver = ResizeObserver;
