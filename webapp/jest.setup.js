import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

beforeEach(() => {
  fetchMock.resetMocks();
});

if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}
