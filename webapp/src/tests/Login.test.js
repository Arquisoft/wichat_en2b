import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Login from '../components/login/Login'; 
import Check2fa from '../components/home/2fa/Check2fa'
import { useRouter } from "next/navigation";
import 'jest-fetch-mock';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

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
    expect(screen.getByText('Don’t have an account?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register here' })).toHaveAttribute('href', '/addUser');
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
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => //NOSONAR
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
    
    act(() => {
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Logging in...');
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });
    
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Login');
    });
  });

  test('handles successful login and redirects', async () => {
    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: mockPush });
    
    fetch.mockResponseOnce(JSON.stringify({ token: 'fake-token' }), { status: 200 });
    
    render(<Login />);
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(document.cookie).toContain('token=fake-token');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
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
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Not a valid password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).not.toBeDisabled();
    });
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
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).not.toBeDisabled();
    });
  });
});

describe("Check2fa Component", () => {
  let mockPush;
  
  beforeEach(() => {
    mockPush = jest.fn();
    useRouter.mockReturnValue({ push: mockPush });
  });

  it("renders correctly", () => {
    render(<Check2fa username="testuser" />);
    expect(screen.getByText(/Two Factor Authentication/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter 2FA Code/i)).toBeInTheDocument();
  });

  it("updates input value on change", () => {
    render(<Check2fa username="testuser" />);
    const input = screen.getByLabelText(/Enter 2FA Code/i);
    fireEvent.change(input, { target: { value: "123456" } });
    expect(input.value).toBe("123456");
  });

  it("redirects to home on successful verification", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "mockToken" }),
      })
    );

    render(<Check2fa username="testuser" />);

    fireEvent.change(screen.getByLabelText(/Enter 2FA Code/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByText(/Verify Code/i));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    // Ensure the cookie was set with the token
    expect(document.cookie).toContain('token=fake-token');
  });
  

});