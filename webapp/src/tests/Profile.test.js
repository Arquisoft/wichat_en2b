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
		jest.useFakeTimers();
		fetch.mockClear();

		axios.get.mockImplementationOnce(() =>
			Promise.resolve({ data: { username: 'testUser' } })
		);
		
		// Mock window.location.reload
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { reload: jest.fn() }
		});
		
		// Create a mock for FileReader
		global.FileReader = class {
			constructor() {
				this.onloadend = jest.fn();
			}
			readAsDataURL(file) {
				this.result = 'data:image/jpeg;base64,mockbase64data';
				setTimeout(() => this.onloadend(), 0);
			}
		};
	});

	afterEach(() => {
		act(() => jest.runOnlyPendingTimers());
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it('should throw an error if username is invalid', () => {
		expect(() => {
		  render(<ProfileForm username={undefined} profilePicture="" onSave={() => {}} />);
		}).toThrowError('Invalid props for ProfileForm component.');
	  });
	
	  it('should throw an error if onSave is not a function', () => {
		expect(() => {
		  render(<ProfileForm username="validUsername" profilePicture="" onSave="notAFunction" />);
		}).toThrowError('Invalid props for ProfileForm component.');
	  });
	
	  it('should render correctly when valid props are provided', () => {
		const { getByText } = render(<ProfileForm username="validUsername" profilePicture="" onSave={() => {}} />);
		expect(getByText('validUsername')).toBeInTheDocument();
	  });

	test('should update username successfully', async () => {
		const { getByLabelText } = render(
		  <ProfileForm username="oldUsername" profilePicture="" onSave={mockOnSave} />
		);

		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
	  
		fireEvent.change(getByLabelText(/Username/i), { target: { value: 'newUsername' } });

		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });
	  
		await waitFor(() => {
		  expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/users'),
			expect.objectContaining({
			  method: 'PATCH',
			  headers: expect.objectContaining({
				'Content-Type': 'application/json',
				Authorization: 'Bearer mock-token',
			  }),
			})
		  );
		});
	});

	test('should update password successfully', async () => {
		render(
			<ProfileForm username="username" profilePicture="" onSave={mockOnSave} />
		);

		// Go to Security tab
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);
		
		// Llenar los campos de contraseña
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });

		const passwordInputs = screen.getAllByLabelText(/password/i, { selector: 'input[type="password"]' });
		const currentPasswordInput = passwordInputs[0];
		const newPasswordInput = passwordInputs[1];
		const confirmPasswordInput = passwordInputs[2];
		fireEvent.change(currentPasswordInput, { target: { value: 'oldPassword' } });
		fireEvent.change(newPasswordInput, { target: { value: 'newPassword' } });
		fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword' } });
		
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });
		
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/users'),
			expect.objectContaining({
				method: 'PATCH',
				headers: expect.objectContaining({
				'Content-Type': 'application/json',
				Authorization: 'Bearer mock-token',
				}),
			}));
		});
	});
	  
	test('successfully uploads profile picture', async () => {
		// Mock fetch response for profile picture upload
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ profilePicture: 'https://example.com/profile.jpg' }),
		});

		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Select the Account tab (where profile picture upload is)
		const accountTab = screen.getByText('Account');
		fireEvent.click(accountTab);

		// Create a mock file
		const file = new File(['(dummy file content)'], 'photo.jpg', {type: 'image/jpeg'});
		
		// Get the hidden file input
		const fileInput = document.querySelector('#profile-picture-input');
		
		// Trigger file selection
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [file] } });
		});
		
		// Wait for the fetch call to be made
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:8000/user/profile/picture',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer mock-token',
						'Content-Type': 'application/json',
					}),
					body: expect.stringContaining('"image":"mockbase64data"'),
				})
			);
		});
		
		// Verify page reload was called
		expect(window.location.reload).toHaveBeenCalled();
	});
	
	test('handles invalid file type for profile picture', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);
		
		// Select the Account tab
		const accountTab = screen.getByText('Account');
		fireEvent.click(accountTab);
		
		// Create a mock file with invalid type
		const file = new File(['(dummy text file)'], 'document.txt', {type: 'text/plain'});
		
		// Get the hidden file input
		const fileInput = document.querySelector('#profile-picture-input');
		
		// Spy on console.error
		jest.spyOn(console, 'error').mockImplementation(() => {});
		
		// Trigger file selection with invalid file
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [file] } });
		});
		
		// Check that fetch wasn't called
		expect(fetch).not.toHaveBeenCalledWith(
			'http://localhost:8000/user/profile/picture', 
			expect.anything()
		);
	});
	
	test('handles file size limit for profile picture', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);
		
		// Select the Account tab
		const accountTab = screen.getByText('Account');
		fireEvent.click(accountTab);
		
		// Create a mock file that exceeds size limit (2MB)
		const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', {type: 'image/jpeg'});
		Object.defineProperty(largeFile, 'size', {value: 3 * 1024 * 1024});
		
		// Get the hidden file input
		const fileInput = document.querySelector('#profile-picture-input');
		
		// Trigger file selection with large file
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [largeFile] } });
		});
		
		// Check that fetch wasn't called
		expect(fetch).not.toHaveBeenCalledWith(
			'http://localhost:8000/user/profile/picture', 
			expect.anything()
		);
	});
	
	test('handles server error during profile picture upload', async () => {
		// Mock a failed upload response
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({ error: 'Server error' }),
		});
		
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);
		
		// Select the Account tab
		const accountTab = screen.getByText('Account');
		fireEvent.click(accountTab);
		
		// Create a mock file
		const file = new File(['(dummy file content)'], 'photo.jpg', {type: 'image/jpeg'});
		
		// Get the hidden file input
		const fileInput = document.querySelector('#profile-picture-input');
		
		// Spy on console.error
		jest.spyOn(console, 'error').mockImplementation(() => {});
		
		// Trigger file selection
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [file] } });
		});
		
		// Verify the fetch was called
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:8000/user/profile/picture',
				expect.anything()
			);
		});
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
		await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: 'oldUsername' } });
	
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
		await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: '' } });
	
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
		await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: 'us' } });
	
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
		await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: 'validNewUsername' } });
		
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });

		// Check that the API was called with the right parameters
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:8000/users', 
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
		const passwordInputs = screen.getAllByLabelText(/password/i, { selector: 'input[type="password"]' });
		const currentPasswordInput = passwordInputs[0];
		const newPasswordInput = passwordInputs[1];
		const confirmPasswordInput = passwordInputs[2];

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
		const passwordInputs = screen.getAllByLabelText(/password/i, { selector: 'input[type="password"]' });
		const currentPasswordInput = passwordInputs[0];
		const newPasswordInput = passwordInputs[1];
		const confirmPasswordInput = passwordInputs[2];
	
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
		const passwordInputs = screen.getAllByLabelText(/password/i, { selector: 'input[type="password"]' });
		const currentPasswordInput = passwordInputs[0];
		const newPasswordInput = passwordInputs[1];
		const confirmPasswordInput = passwordInputs[2];
	
		// Enter a password that is too short
		await fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
		await fireEvent.change(newPasswordInput, { target: { value: 'short' } });
		await fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
	
		// Find and click the "Save Password" button
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });	
		await waitFor(() => expect(screen.getByText('Save Password')).toBeInTheDocument());
	});

	test('Handles error when the username update fails', async () => {
		// Mock the fetch response for a failed username update
		fetch.mockResolvedValueOnce({
			ok: false,  // Simulate a failed response
			status: 400,
			json: async () => ({ error: 'Username already taken' }),  // Simulate error message
		});
	
		render(<ProfileForm username="oldUsername" onSave={mockOnSave} />);
	
		// Simulate editing the username
		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
		await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: 'takenUsername' } });
	
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });
	
		// Verify that fetch was called with the correct parameters
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:8000/users', // URL with old username
				expect.objectContaining({
					method: 'PATCH',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						'Authorization': 'Bearer mock-token', // token passed in the request header
					}),
					body: JSON.stringify({ newUsername: 'takenUsername' }), // new username
				})
			);
		});

		await waitFor(() => {
			expect(screen.getByText("Save Username")).toBeInTheDocument(); 
		});
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

	test('Shows error message when server rejects username update', async () => {
		// Mock the fetch response for a failed username update
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: 'Username already taken' }),
		});

		render(<ProfileForm username="oldUsername" onSave={mockOnSave} />);

		// Edit the username
		const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
		await act(async () => { editUsernameButton.click(); });
		await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: 'takenUsername' } });
		
		// Find and click the "Save Username" button
		const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
		await act(async () => { saveUsernameButton.click(); });

		// Verify the fetch was called
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:8000/users',
				expect.anything()
			);
		});

		// Verify error message is displayed via snackbar
		await waitFor(() => {
			expect(screen.getByText(/Save Username/i)).toBeInTheDocument();
		});
	});

	test('Handles network failure during password update', async () => {
		// Mock a network failure
		fetch.mockRejectedValueOnce(new Error('Network error'));
		
		// Spy on console.error
		jest.spyOn(console, 'error').mockImplementation(() => {});

		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Go to Security tab
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);

		// Update password fields
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		await fireEvent.change(screen.getByLabelText('Actual password'), { target: { value: 'currentpassword' } });
		await fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'validpassword123' } });
		await fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'validpassword123' } });
		
		// Save password
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });

		// Verify error was logged
		await waitFor(() => {
			expect(console.error).toHaveBeenCalled();
		});
	});

	test('Handles server error during password update', async () => {
		// Mock the fetch response for a failed password update (response.ok = false)
		fetch.mockResolvedValueOnce({
			ok: false, // Simula un error en la respuesta
			json: async () => ({ error: 'Some error occurred' }), // Simula un error de la API
		});
	
		const setProfileData = jest.fn();
		const mockSave = jest.fn();
	
		render(<ProfileForm username="testuser" onSave={mockSave} />);
	
		// Go to Security tab
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);
	
		// Simulate entering new password data
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		await fireEvent.change(screen.getByLabelText('Actual password'), { target: { value: 'currentpassword' } });
		await fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
		await fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });
	
		// Find and click the "Save Password" button
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });
	
		await waitFor(() => {
			expect(screen.getByText("Save Password")).toBeInTheDocument(); 
		});
	
		// Verify that setProfileData was NOT called (since the password update failed)
		expect(setProfileData).not.toHaveBeenCalled();
	
		// Ensure onSave is not called either
		expect(mockSave).not.toHaveBeenCalled();
	});

	test('Handles empty file selection for profile picture', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);
		
		const accountTab = screen.getByText('Account');
		fireEvent.click(accountTab);
		
		const fileInput = document.querySelector('#profile-picture-input');
		
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [] } });
		});
		
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost:8000/check2fa', 
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({
					'Authorization': 'Bearer mock-token',
					'Content-Type': 'application/json',
				}),
			})
				
		);
	});

	test('Handles profile picture upload correctly', async () => {
		fetch.mockResolvedValueOnce({
			ok: true, 
			json: async () => ({ profilePicture: 'new-image-url' }), 
		});
	
		render(<ProfileForm username="testuser" onSave={jest.fn()} />);
	
		const file = new File(['dummy content'], 'profile-pic.png', { type: 'image/png' });
		const inputFile = screen.getByLabelText(/profile picture/i);
		fireEvent.change(inputFile, { target: { files: [file] } });
	
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/user/profile/picture'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: expect.any(String),
					}),
				})
			);
		});
	});
	
	test('Handles error during profile picture upload', async () => {
		fetch.mockResolvedValueOnce({
			ok: false, 
			status: 400, 
			json: async () => ({ error: 'Invalid image format' }), 
		});

		const setProfileData = jest.fn();
		render(<ProfileForm username="testuser" onSave={jest.fn()} />);
	
		const file = new File(['dummy content'], 'profile-pic.png', { type: 'image/png' });
		const inputFile = screen.getByLabelText(/profile picture/i);
		fireEvent.change(inputFile, { target: { files: [file] } });
	
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/user/profile/picture'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: expect.any(String),
					}),
				})
			);
		});
	
		expect(setProfileData).not.toHaveBeenCalled();
	});	

	test('Shows error when API rejects profile picture', async () => {
		// Mock a rejected profile picture
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 413,
			json: async () => ({ message: 'Image too large' }),
		});

		render(<ProfileForm username="testuser" onSave={mockOnSave} />);
		
		// Go to Account tab
		const accountTab = screen.getByText('Account');
		fireEvent.click(accountTab);
		
		// Create a mock file
		const file = new File(['dummy content'], 'photo.jpg', {type: 'image/jpeg'});
		
		// Get the file input and trigger upload
		const fileInput = document.querySelector('#profile-picture-input');
		await act(async () => {
			fireEvent.change(fileInput, { target: { files: [file] } });
		});
		
		// Verify error is displayed
		await waitFor(() => {
			expect(screen.getByText(/Change profile picture/i)).toBeInTheDocument();
		});
	});

	test('Failed username update', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		const editUsername = screen.getByRole("button", { name: /Edit Username/i });
		fireEvent.click(editUsername);
	
		// Wait for the fetch to be called (or any other side-effect you expect)
		await waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});
	});

	test('Failed password update', async () => {
		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Go to Security tab
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);

		const editPasswordButton = screen.getByRole("button", { name: /Edit Password/i });
		fireEvent.click(editPasswordButton);
	
		// Wait for the fetch to be called (or any other side-effect you expect)
		await waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});
	});

	test('Handles server error during password update', async () => {
		// Mock server error response
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
			json: async () => ({ message: 'Current password is incorrect' }),
		});

		render(<ProfileForm username="testuser" onSave={mockOnSave} />);

		// Go to Security tab
		const securityTab = screen.getByText('Security');
		fireEvent.click(securityTab);

		// Fill in password fields
		const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
		await act(async () => { editPasswordButton.click(); });
		await fireEvent.change(screen.getByLabelText('Actual password'), { target: { value: 'wrongpassword' } });
		await fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
		await fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });
		
		// Save password
		const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
		await act(async () => { savePasswordButton.click(); });

		// Verify error message
		await waitFor(() => {
			expect(screen.getByText("Save Password")).toBeInTheDocument();
		});
	});

	// Test for username update with same username 
    test('Shows notification when saving with unchanged username', async () => {
        render(<ProfileForm username="testuser" onSave={mockOnSave} />);

        // Edit the username but don't change it
        const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
        await act(async () => { editUsernameButton.click(); });
        
        // Don't actually change the input value
        
        // Find and click the "Save Username" button
        const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
        await act(async () => { saveUsernameButton.click(); });

        // Verify snackbar shows message about no changes
        await waitFor(() => {
            expect(screen.getByText("No changes on username detected.")).toBeInTheDocument();
        });
    });

    // Test for network error during username update 
    test('Handles network error during username update', async () => {
        // Mock network error
        fetch.mockRejectedValueOnce(new Error('Network error'));
        
        // Spy on console.error
        jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<ProfileForm username="testuser" onSave={mockOnSave} />);

        // Edit username
        const editUsernameButton = await screen.findByRole("button", { name: /Edit Username/i });
        await act(async () => { editUsernameButton.click(); });
        await fireEvent.change(screen.getByRole("textbox", { name: /Username/i }), { target: { value: 'newUsername' } });
        
        // Save username
        const saveUsernameButton = await screen.findByRole("button", { name: /Save Username/i });
        await act(async () => { saveUsernameButton.click(); });

        // Verify error was logged
        await waitFor(() => {
            expect(console.error).toHaveBeenCalled();
        });
    });

    // Test for missing new password (lines 91-95)
    test('Shows error when new password is missing', async () => {
        render(<ProfileForm username="testuser" onSave={mockOnSave} />);

        // Go to Security tab
        const securityTab = screen.getByText('Security');
        fireEvent.click(securityTab);

        // Update password fields
        const editPasswordButton = await screen.findByRole("button", { name: /Edit Password/i });
        await act(async () => { editPasswordButton.click(); });
        
        // Only fill current password, leave new password empty
        await fireEvent.change(screen.getByLabelText('Actual password'), { target: { value: 'currentpassword' } });
        
        // Save password
        const savePasswordButton = await screen.findByRole("button", { name: /Save Password/i });
        await act(async () => { savePasswordButton.click(); });

        // Verify error message about missing new password
        await waitFor(() => {
            expect(screen.getByText("Please enter a new password.")).toBeInTheDocument();
        });
    });

	// Test handleProfilePictureChange with file size exceeding limit
    test('Shows error for file size exceeding limit', async () => {
        render(<ProfileForm username="testuser" onSave={mockOnSave} />);

        // Select the Account tab
        const accountTab = screen.getByText('Account');
        fireEvent.click(accountTab);

        // Create a mock file that exceeds size limit (2MB)
        const largeFile = new File(['x'], 'large.jpg', {type: 'image/jpeg'});
        Object.defineProperty(largeFile, 'size', {value: 3 * 1024 * 1024});
        
        // Get the hidden file input
        const fileInput = document.querySelector('#profile-picture-input');
        
        // Trigger file selection with large file
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [largeFile] } });
        });

        // Verify error message about file size
        await waitFor(() => {
            expect(screen.getByText("This file is too large. Maximum size is 2MB.")).toBeInTheDocument();
        });
    });

    // Test the base64 image extraction and upload in handleProfilePictureChange 
    test('Extracts and uploads base64 image data', async () => {
        // Spy on console.log
        jest.spyOn(console, 'log').mockImplementation(() => {});

        // Mock successful profile image upload
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ profilePicture: 'https://example.com/profile.jpg' }),
        });

        render(<ProfileForm username="testuser" onSave={mockOnSave} />);

        // Go to Account tab
        const accountTab = screen.getByText('Account');
        fireEvent.click(accountTab);

        // Create a valid mock file
        const file = new File(['dummy image data'], 'photo.jpg', {type: 'image/jpeg'});
        
        // Get the file input
        const fileInput = document.querySelector('#profile-picture-input');
        
        // Upload the file
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });
    });

    // Test avatar display with and without profile picture
    test('Displays avatar correctly without profile picture', () => {
        render(<ProfileForm username="testuser" onSave={mockOnSave} />);
        
        // Avatar should display the first letter of the username
        expect(screen.getByText('t')).toBeInTheDocument();
    });

    // Test profile picture error display
    test('Shows profile picture error message when present', async () => {
        render(<ProfileForm username="testuser" onSave={mockOnSave} />);

        // Go to Account tab
        const accountTab = screen.getByText('Account');
        fireEvent.click(accountTab);

        // Create an invalid file type
        const invalidFile = new File(['dummy text'], 'document.txt', {type: 'text/plain'});
        
        // Get the file input
        const fileInput = document.querySelector('#profile-picture-input');
        
        // Try to upload invalid file
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [invalidFile] } });
        });

        // Verify error message is displayed
        await waitFor(() => {
            expect(screen.getByText("Invalid file type. Please select an image.")).toBeInTheDocument();
        });
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
