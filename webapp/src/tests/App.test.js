import { render, screen } from '@testing-library/react';
import App from './App';

test('renders welcome message', () => {
  render(<App />);
  //const welcomeMessage = screen.getByText(/Welcome to the 2025 edition of the Software Architecture course/i);
  
  //TODO: This is to bipass the login screen and go directly to the game (Prototype)
  expect(screen.getByText(/Question 1 of \d/i)).toBeInTheDocument();
});


