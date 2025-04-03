import React from "react";
import {render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import QrCode from "../components/home/2fa/qrCode";
import ProfileForm from "../components/home/ui/ProfileForm";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000'; // NOSONAR

// Mock fetch and document.cookie
global.fetch = jest.fn();
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'token=mock-token', // You can change this to test different scenarios
});

jest.mock('../utils/auth.js', () => ({
    getAuthToken: jest.fn(),
}));

describe('ProfileForm', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
  });

  it('Does not udpate the username if it is the same as the current one', async () => {
		const mockApiResponse = { username: 'oldUsername' };

		fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => JSON.stringify(mockApiResponse),
		});

      
		render(
			<ProfileForm username="testuser" onSave={mockOnSave} />
		);

		// Simulate a change in the input field
		await fireEvent.click(screen.getByText('Edit Username'));
		const input = screen.getByLabelText('Username');
		await fireEvent.change(input, { target: { value: 'oldUsername' } });
	
		// handleSaveUsername
		await fireEvent.click(screen.getByText('Save Username'));

		await waitFor(() => expect(screen.getByText('Save Username')).toBeInTheDocument());
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
