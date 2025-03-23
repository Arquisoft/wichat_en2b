import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Login from '../components/login/Login'; 
import 'jest-fetch-mock';

global.fetch = require('jest-fetch-mock');

describe('Login Component', () => {
  beforeEach(() => {
    fetch.resetMocks();
    jest.useFakeTimers();
    delete window.location;
    window.location = { href: '' };
    Storage.prototype.setItem = jest.fn();
    window.alert = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders the Login component correctly', () => {
    render(<Login />);
    expect(screen.getByText('Welcome to WIChat')).toBeInTheDocument();
    expect(screen.getByText('Login to start playing!')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    // Use a more flexible text matching approach for the apostrophe
    expect(screen.getByText('Don’t have an account?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register here' })).toHaveAttribute('href', '/register');
  });

  test('updates username and password inputs on change', () => {
    render(<Login />);
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('testpass');
  });

  test('displays loading state when form is submitted', async () => {
    // Mock a delayed response to ensure we can see the loading state
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => 
          resolve({
            ok: true,
            json: () => Promise.resolve({ token: 'fake-token' })
          }), 
          100
        )
      )
    );
  
    render(<Login />);
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
  
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    // Use separate act for clicking the button
    act(() => {
      fireEvent.click(submitButton);
    });
    
    // Wait for loading state outside of act
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Logging in...');
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });
    
    // Advance timers to complete the fetch
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Login');
    });
  });

  test('handles successful login and redirects', async () => {
    fetch.mockResponseOnce(JSON.stringify({ token: 'fake-token' }), { status: 200 });
    
    render(<Login />);
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
      // Advance timers to complete all pending promises
      jest.advanceTimersByTime(1000);
    });

    // Now the loading state should be false and all effects applied
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
    expect(window.alert).toHaveBeenCalledWith('Login successful! Token stored in localStorage.');
    expect(window.location.href).toBe('/');
  });

  test('displays error message on login failure (wrong password)', async () => {
    fetch.mockResponseOnce(JSON.stringify({ error: 'Not a valid password' }), { status: 401 });
    
    render(<Login />);
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
      // Advance timers to complete all pending promises
      jest.advanceTimersByTime(1000);
    });

    // Check error message
    expect(screen.getByText('Not a valid password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).not.toBeDisabled();
  });

  test('displays generic error on server failure', async () => {
    fetch.mockResponseOnce(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    
    render(<Login />);
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
      // Advance timers to complete all pending promises
      jest.advanceTimersByTime(1000);
    });

    // Check error message
    expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).not.toBeDisabled();
  });
});