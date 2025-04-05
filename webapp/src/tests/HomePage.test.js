import React from "react";
import {render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import HomePage from "../components/home/HomeViewPage";
import Navbar from "../components/home/ui/Navbar";
import mockRouter from 'next-router-mock';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import axios from 'axios';

jest.mock('next/navigation', () => require('next-router-mock'));
jest.mock('axios');

// Mock fetch and document.cookie
global.fetch = jest.fn(() =>
	Promise.resolve({
	  ok: true,
	  json: () =>
		Promise.resolve({ profilePicture: 'http://example.com/profile.png' }),
	})
);
  
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'token=mock-token',
});


describe('HomePage Component', () => {
	beforeEach(() => {
		jest.useFakeTimers();

		axios.get.mockImplementationOnce(() =>
			Promise.resolve({ data: { username: 'testUser' } })
		);
	});
	
	afterEach(() => {
		act(() => jest.runOnlyPendingTimers());
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	test('renders the HomePage component correctly', async () => {
		await act(async () => {
			render(<HomePage/>);
		});

		await waitFor(() => {
			expect(screen.getByText('WiChat', {selector: 'h1'})).toBeInTheDocument();
			expect(screen.getByText('Connect, Learn, and Play with WiChat')).toBeInTheDocument();
			expect(screen.getByText('Play')).toBeInTheDocument();
			expect(screen.getByText('Stats')).toBeInTheDocument();
			expect(screen.getByText('Leaderboard')).toBeInTheDocument();
		});
	});

	test('changes tabs when clicked', async () => {
		await act(async () => {
			render(<HomePage/>);
		});

		await waitFor(() => {
			expect(screen.getByText('Play')).toBeInTheDocument();
			expect(screen.queryByText('Stats')).toBeInTheDocument();
			expect(screen.queryByText('Leaderboard')).toBeInTheDocument();
		});

		await act(async () => {
			fireEvent.click(screen.getByText('Stats'));
		});

		jest.advanceTimersByTime(0);

		await waitFor(() => {
			expect(screen.getByText('Quiz Statistics')).toBeInTheDocument();
		});

		await act(async () => {
			fireEvent.click(screen.getByText('Leaderboard'));
		});

		jest.advanceTimersByTime(0);

		await waitFor(() => {
			expect(screen.getByText('WiChat Leaderboard')).toBeInTheDocument();
		});
  	});

  	test('renders the footer with the current year', async () => {
		await act(async () => {
	  		render(<HomePage/>);
		});

		const currentYear = new Date().getFullYear();

		await waitFor(() => {
			expect(screen.getByText(`© ${currentYear} WiChat. All rights reserved.`)).toBeInTheDocument();
		});		
  	});

 	test('navbar renders correctly', async () => {
		await act(async () => {
			render(<HomePage/>);
		});

		await waitFor(() => {
			expect(screen.getByText('Profile')).toBeInTheDocument();
		});
  	});

 	test('navbar opens profile dialog when profile button is clicked', async () => {
		await act(async () => {
			render(<Navbar username="testUser" />);
		});
		
		await waitFor(() => {
			expect(screen.queryByText('Account')).not.toBeInTheDocument();
		});

		act(() => { fireEvent.click(screen.getByText('Profile')); });
		jest.advanceTimersByTime(0);

		await waitFor(() => {
			expect(screen.getByText('Account')).toBeInTheDocument();
		});
	});

	test("redirects to login page when logout button is clicked", async () => { 
		await act(async () => {
			render(
				<MemoryRouterProvider>
					<Navbar username="testUser" />
				</MemoryRouterProvider>
			);
		});

		const logoutButton = screen.getByLabelText('logout');  
		fireEvent.click(logoutButton);

		await waitFor(() => {
			expect(mockRouter.asPath).toBe('/login');
		});
	});
});
