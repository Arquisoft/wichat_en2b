import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import GuestHomePage from "../components/home/GuestHomeViewPage";
import Navbar from "../components/home/ui/Navbar";

import mockRouter from 'next-router-mock';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

jest.mock('next/navigation', () => require('next-router-mock'));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

describe('GuestHomePage Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders the GuestHomePage component correctly', async () => {
    await act(async () => {
      render(<GuestHomePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('WiChat Guest Mode')).toBeInTheDocument();
      expect(screen.getByText('Play quizzes anonymously - scores won\'t be saved')).toBeInTheDocument();
    });
  });

  test('renders only the Play tab', async () => {
    await act(async () => {
      render(<GuestHomePage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Stats')).not.toBeInTheDocument();
      expect(screen.queryByText('Leaderboard')).not.toBeInTheDocument();
    });
  });

  test('renders the footer with the current year', async () => {
    await act(async () => {
      render(<GuestHomePage />);
    });

    const currentYear = new Date().getFullYear();

    await waitFor(() => {
      expect(screen.getByText(`© ${currentYear} WiChat. All rights reserved.`)).toBeInTheDocument();
    });
  });

  test('navbar renders correctly without username', async () => {
    await act(async () => {
      render(<GuestHomePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  test('redirects to login page when login button is clicked', async () => {
    await act(async () => {
      render(
        <MemoryRouterProvider>
          <Navbar />
        </MemoryRouterProvider>
      );
    });

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockRouter.asPath).toBe('/login');
    });
  });
});