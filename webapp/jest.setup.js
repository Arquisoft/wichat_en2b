const fetchMock = require('jest-fetch-mock');

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
