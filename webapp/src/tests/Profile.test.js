import React from "react";
import {render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import QrCode from "../components/home/2fa/qrCode";
import ProfileForm from "../components/home/ui/ProfileForm";
import axios from 'axios';

jest.mock('next/navigation', () => require('next-router-mock'));
jest.mock('axios');

global.fetch = jest.fn();

// Mock fetch and document.cookie
global.fetch = jest.fn();

Object.defineProperty(document, 'cookie', {
  writable: true,
  configurable: true,
  value: 'token=mock-token',
});


jest.mock('../utils/auth.js', () => ({
    getAuthToken: jest.fn(),
}));

describe('ProfileForm', () => {
  const mockOnSave = jest.fn();

  	beforeEach(() => {
		fetch.mockClear();

		axios.get.mockImplementationOnce(() =>
			Promise.resolve({ data: { username: 'testUser' } })
		);
  	});

  	afterEach(() => {
		act(() => jest.runOnlyPendingTimers());
		jest.useRealTimers();
		jest.clearAllMocks();
	});

  	test('Does not udpate the username if it is the same as the current one', async () => {
		const mockApiResponse = { username: 'oldUsername' };

		fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => JSON.stringify(mockApiResponse),
		});

		render(
			<ProfileForm username="testuser" onSave={mockOnSave} />
		);

		// Simulate a change in the input field
		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
		const input = screen.getByLabelText('Username');
		await fireEvent.change(input, { target: { value: 'oldUsername' } });
	
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });

		await waitFor(() => expect(screen.getByText('Save Username')).toBeInTheDocument());
    });

	test('Does not udpate the username if the new one is empty', async () => {
		const mockApiResponse = { username: 'oldUsername' };

		fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => JSON.stringify(mockApiResponse),
		});

		render(
			<ProfileForm username="testuser" onSave={mockOnSave} />
		);

		// Simulate a change in the input field
		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
		const input = screen.getByLabelText('Username');
		await fireEvent.change(input, { target: { value: '' } });
	
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });

		await waitFor(() => expect(screen.getByText('Save Username')).toBeInTheDocument());
    });

	test('Does not udpate the username if the new is too short', async () => {
		const mockApiResponse = { username: 'oldUsername' };

		fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => JSON.stringify(mockApiResponse),
		});
      
		render(
			<ProfileForm username="testuser" onSave={mockOnSave} />
		);

		// Simulate a change in the input field
		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
		const input = screen.getByLabelText('Username');
		await fireEvent.change(input, { target: { value: 'us' } });
	
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });
	});

	test('Correctly updates username', async () => {
		// Delete the existing property first
		delete Object.getOwnPropertyDescriptor(document, 'cookie'); //NOSONAR
		
		// Mock the fetch response for a successful username update
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ token: 'new-token' }),
		});

		// Create a spy on document.cookie
		const setCookieMock = jest.fn();
		const getCookieMock = jest.fn(() => 'token=mock-token');

		Object.defineProperty(document, 'cookie', {
			configurable: true,
			set: setCookieMock,
			get: getCookieMock,
		});

		const mockSave = jest.fn();
		render(<ProfileForm username="oldUsername" onSave={mockSave} />);

		// Edit the username
		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
		fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'validNewUsername' } });
		
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });

		// Check that the API was called with the right parameters
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:8000/users/oldUsername', 
				expect.objectContaining({
					method: 'PATCH',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						'Authorization': 'Bearer mock-token',
					}),
					body: JSON.stringify({ newUsername: 'validNewUsername' }),
				})
			);
		});
	});

	test('Does not update the password if the current password is missing', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Ensure the "Security" tab is selected
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);
	
		// Simulate a change in the password fields
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		const currentPasswordInput = screen.getByLabelText('Actual password');
		const newPasswordInput = screen.getByLabelText('New password');
		const confirmPasswordInput = screen.getByLabelText('Confirm new password');
	
		// Update the new password fields without providing current password
		await fireEvent.change(currentPasswordInput, { target: { value: '' } });
		await fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
		await fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
	
		// Find and click the "Save Password" button
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });
		await waitFor(() => expect(screen.getByText('Save Password')).toBeInTheDocument());
	});

	test('Does not update the password if new password and confirmation do not match', async () => {	
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Ensure the "Security" tab is selected
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);
	
		// Simulate a change in the password fields
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		const currentPasswordInput = screen.getByLabelText('Actual password');
		const newPasswordInput = screen.getByLabelText('New password');
		const confirmPasswordInput = screen.getByLabelText('Confirm new password');
	
		// Enter mismatched passwords
		await fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
		await fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
		await fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword123' } });
	
		// Find and click the "Save Password" button
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });
		await waitFor(() => expect(screen.getByText('Save Password')).toBeInTheDocument());
	});	

	test('Does not update the password if the new password is too short', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Ensure the "Security" tab is selected
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);
	
		// Simulate a change in the password fields
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		const currentPasswordInput = screen.getByLabelText('Actual password');
		const newPasswordInput = screen.getByLabelText('New password');
		const confirmPasswordInput = screen.getByLabelText('Confirm new password');
	
		// Enter a password that is too short
		await fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
		await fireEvent.change(newPasswordInput, { target: { value: 'short' } });
		await fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
	
		// Find and click the "Save Password" button
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });	
		await waitFor(() => expect(screen.getByText('Save Password')).toBeInTheDocument());
	});

	test('Correctly updates password', async () => {
		// Mock the fetch response for a successful password update
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ token: 'new-token' }),
		});

		// Create a spy on document.cookie
		const setCookieMock = jest.fn();
		const getCookieMock = jest.fn(() => 'token=mock-token');

		Object.defineProperty(document, 'cookie', {
			configurable: true,
			set: setCookieMock,
			get: getCookieMock,
		});

		const mockSave = jest.fn();
		render(<ProfileForm username="testuser" onSave={mockSave} />);

		// Ensure the "Security" tab is selected
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);

		// Simulate a password update
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		await fireEvent.change(screen.getByLabelText('Actual password'), { target: { value: 'currentpassword' } });
		await fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
		await fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });
		
		// Find and click the "Save Password" button
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });
	
		// Now we try to change our new password
		// Since the password is already updated, we can just click the button and it is not going to do anything
		await act(async () => { editPasswordButton.click(); });
		await fireEvent.change(screen.getByLabelText('Actual password'), { target: { value: 'newpassword123' } });
		await fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
		await fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });
		
		// Click the "Save Password" button
		await act(async () => { savePasswordButton.click(); });
	});	

	test('should check 2FA status on component mount', async () => {
		const mockApiResponse = { twoFactorEnabled: true };
		fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => JSON.stringify(mockApiResponse),
		});

		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Ensure the "2FA" tab is selected
		const securityTab = screen.getByText('2FA');
		fireEvent.click(securityTab);

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
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);
	
		// Ensure the "2FA" tab is selected
		const securityTab = screen.getByText('2FA');
		fireEvent.click(securityTab);
	
		// Now that we're in the 2FA tab, try to find the "Configure 2FA" button
		const configure2faButton = screen.getByText('Configure 2FA');
		fireEvent.click(configure2faButton);
	
		// Wait for the fetch to be called (or any other side-effect you expect)
		await waitFor(() => {
		expect(fetch).toHaveBeenCalled();
		});
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
});
