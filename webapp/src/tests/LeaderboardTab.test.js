import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LeaderboardTab from '../components/home/ui/LeaderboardTab';
import { fetchWithAuth } from '../utils/api-fetch-auth';
import { getAuthToken, getCurrentPlayerId } from '../utils/auth';

jest.mock('../utils/api-fetch-auth');
jest.mock('../utils/auth');

describe('LeaderboardTab Component', () => {
    const mockLeaderboardData = {
        leaderboard: [
            { _id: 'player1', totalScore: 1000, totalGames: 10, avgScore: 100, rank: 1 },
            { _id: 'player2', totalScore: 900, totalGames: 9, avgScore: 90, rank: 2 },
            { _id: 'player3', totalScore: 800, totalGames: 8, avgScore: 80, rank: 3 }
        ]
    };

    beforeEach(() => {
        fetchWithAuth.mockClear();
        getAuthToken.mockReturnValue('fake-token');
        getCurrentPlayerId.mockResolvedValue('player1');
    });

    it('renders loading state initially', () => {
        fetchWithAuth.mockImplementation(() => new Promise(() => {}));
        render(<LeaderboardTab />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders leaderboard data with correct formatting', async () => {
        fetchWithAuth.mockResolvedValue(mockLeaderboardData);

        render(<LeaderboardTab />);

        await waitFor(() => {
            expect(screen.getByText(/1[,.]?000/)).toBeInTheDocument(); // Acepta 1000 o 1,000 o 1.000
            expect(screen.getByText(/^10$/)).toBeInTheDocument(); // Exactamente 10
            expect(screen.getByText(/^100[,.]?00$/)).toBeInTheDocument(); // Acepta 100.00 o 100,00
            expect(screen.getByText('player1 (You)')).toBeInTheDocument();
        });
    });

    it('displays error message when API call fails', async () => {
        fetchWithAuth.mockRejectedValue(new Error('Failed to fetch'));
        render(<LeaderboardTab />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
        });
    });

    it('highlights current player row', async () => {
        fetchWithAuth.mockResolvedValue(mockLeaderboardData);
        getCurrentPlayerId.mockResolvedValue('player2');

        render(<LeaderboardTab />);

        await waitFor(() => {
            const playerRow = screen.getByText('player2 (You)').closest('tr');
            expect(playerRow).toHaveClass('current-player');
        });
    });

    it('displays all required columns', async () => {
        fetchWithAuth.mockResolvedValue(mockLeaderboardData);

        render(<LeaderboardTab />);

        await waitFor(() => {
            expect(screen.getByText('Rank')).toBeInTheDocument();
            expect(screen.getByText('Username')).toBeInTheDocument();
            expect(screen.getByText('Total Score')).toBeInTheDocument();
            expect(screen.getByText('Games Played')).toBeInTheDocument();
            expect(screen.getByText('Average Score')).toBeInTheDocument();
        });
    });

    it('handles invalid leaderboard data', async () => {
        fetchWithAuth.mockResolvedValue({});

        render(<LeaderboardTab />);

        await waitFor(() => {
            expect(screen.getByText('Invalid leaderboard data')).toBeInTheDocument();
        });
    });
});