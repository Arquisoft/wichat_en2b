import React from "react";
import {render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import HomePage from "../components/home/HomeViewPage";
import Navbar from "../components/home/ui/Navbar";
import QrCode from "../components/home/2fa/qrCode";
import ProfileForm from "../components/home/ui/ProfileForm";

global.fetch = jest.fn();
import "@testing-library/jest-dom";
import { act } from "react-dom/test-utils"; //NOSONAR

// Mock fetch and document.cookie
global.fetch = jest.fn();
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'token=mock-token', // You can change this to test different scenarios
});

describe('ProfileForm', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
  });

  test('should handle setup2FA when clicking the button', async () => {
    const mockQrCodeUrl = "http://example.com/qrcode.png";
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ imageUrl: mockQrCodeUrl }),
    });

    render(<ProfileForm username="testuser" onSave={mockOnSave} />);

    // Click the 2FA button to trigger setup2FA
    fireEvent.click(screen.getByText('Configure 2FA'));

    // Wait for the QR code to be displayed
    await waitFor(() => screen.getByAltText('QR Code'));

    expect(screen.getByAltText('QR Code')).toHaveAttribute('src', mockQrCodeUrl);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/setup2fa', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      }),
    }));
  });

  test('should check 2FA status on component mount', async () => {
    const mockApiResponse = { twoFactorEnabled: true };
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockApiResponse),
    });

    render(<ProfileForm username="testuser" onSave={mockOnSave} />);

    // Wait for the component to make the check2FA request
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('http://localhost:8000/check2fa', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      }),
    })));

    // Check that the `already2fa` state is set correctly
    await waitFor(() => {
      expect(screen.getByText('Reset 2FA')).toBeInTheDocument();
    });
  });

  test('should handle failed 2FA setup', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<ProfileForm username="testuser" onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Configure 2FA'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch'));
    });
  });
});

test("fetches and displays QR code", async () => {
  fetch.mockResolvedValueOnce({
    json: async () => ({ imageUrl: "https://example.com/qrcode.png" }),
  });

  render(<ProfileForm username="testUser" onSave={jest.fn()} />);

  // Click on the "2FA" tab first
  const twoFaTab = screen.getByRole("tab", { name: /2FA/i });
  await act(async () => {
    twoFaTab.click();
  });

  // Find and click the "Configure 2FA" button
  const configureButton = await screen.findByRole("button", { name: /2FA|Configure/i });
  await act(async () => {
    configureButton.click();
  });


});



// For mocking the router
import mockRouter from 'next-router-mock';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
jest.mock('next/navigation', () => require('next-router-mock'));

describe('HomePage Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders the HomePage component correctly', () => {
    render(<HomePage />);
    
    expect(screen.getByText('WiChat', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Connect, Learn, and Play with WiChat')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  test('changes tabs when clicked', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.queryByText('Stats')).toBeInTheDocument();
    expect(screen.queryByText('Leaderboard')).toBeInTheDocument();
    
    act(() => { fireEvent.click(screen.getByText('Stats')); });
    jest.advanceTimersByTime(0);
    expect(screen.getByText('Recent Quizzes')).toBeInTheDocument();
    
    act(() => { fireEvent.click(screen.getByText('Leaderboard')); });
    jest.advanceTimersByTime(0);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  test('renders the footer with the current year', () => {
    render(<HomePage />);
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} WiChat. All rights reserved.`)).toBeInTheDocument();
  });

  test('navbar renders correctly', () => {
    render(<HomePage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('navbar opens profile dialog when profile button is clicked', () => {
    render(<Navbar username="testUser" />);
    
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Profile')); });
    jest.advanceTimersByTime(0);
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  test('navbar closes profile dialog when save button is clicked', async () => {
    render(<Navbar username="testUser" />);
    
    act(() => { fireEvent.click(screen.getByText('Profile')); });
    expect(screen.getByText('Account')).toBeInTheDocument();
    
    act(() => { fireEvent.click(screen.getByText('Edit')); });
    jest.advanceTimersByTime(0);
    expect(screen.getByText('Account')).toBeInTheDocument();

    act(() => { fireEvent.click(screen.getByText('Save')); });
    jest.advanceTimersByTime(0);
    
    await waitFor(() => {
      expect(screen.queryByText('Account')).not.toBeInTheDocument();
    });
  });

  test("redirects to login page when logout button is clicked", async () => { 
    render(
        <MemoryRouterProvider>
          <Navbar username="testUser" />
        </MemoryRouterProvider>
    );

    const logoutButton = screen.getByLabelText('logout');  
    fireEvent.click(logoutButton);

    await waitFor(() => {
        expect(mockRouter.asPath).toBe('/login');
    });
  });

describe("QrCode Component", () => {
  test("renders QR Code image when imgUrl is provided", () => {
    const testUrl = "https://example.com/qrcode.png";
    render(<QrCode imgUrl={testUrl} />);
    
    const imgElement = screen.getByAltText("QR Code for 2FA");
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute("src", testUrl);
  });

  test("renders fallback text when imgUrl is not provided", () => {
    render(<QrCode imgUrl={null} />);
    
    const fallbackText = screen.getByText("QR Code is not available.");
    expect(fallbackText).toBeInTheDocument();
  });
});

});
