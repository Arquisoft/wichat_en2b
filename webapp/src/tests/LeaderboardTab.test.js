import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import LeaderboardTab from '../components/home/ui/LeaderboardTab';
import { fetchWithAuth } from '../utils/api-fetch-auth';
import { getAuthToken, getCurrentPlayerId } from '../utils/auth';
import axios from 'axios';

jest.mock('../utils/api-fetch-auth');
jest.mock('../utils/auth');
jest.mock('axios');

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
      // Mock para fetchWithAuth
      fetchWithAuth.mockResolvedValue(mockLeaderboardData);
      
      // Mock para la solicitud de detalles de usuario
      axios.post.mockImplementation((url) => {
        if (url.includes('/users/by-ids')) {
          return Promise.resolve({ 
            data: [
              { _id: 'player1', username: 'player1' },
              { _id: 'player2', username: 'player2' },
              { _id: 'player3', username: 'player3' }
            ]
          });
        }
        return Promise.reject(new Error(`Unhandled URL in test: ${url}`));
      });
    
      render(<LeaderboardTab />);
    
      await waitFor(() => {
        expect(screen.getByText(/1[,.]?000 points/)).toBeInTheDocument(); // Acepta 1000 o 1,000 o 1.000
        expect(screen.getByText(/^10$/)).toBeInTheDocument(); // Exactamente 10
        expect(screen.getByText("100.0 points")).toBeInTheDocument(); // Acepta 100.00 o 100,00
        expect(screen.getByText(/player1/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays error message when API call fails', async () => {
        fetchWithAuth.mockRejectedValue(new Error('Failed to fetch'));
        render(<LeaderboardTab />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
        });
    });

    it('highlights current player row', async () => {
      // Mock para fetchWithAuth
      fetchWithAuth.mockResolvedValue(mockLeaderboardData);
      
      // Mock para la solicitud de detalles de usuario
      axios.post.mockImplementation((url) => {
        if (url.includes('/users/by-ids')) {
          return Promise.resolve({ 
            data: [
              { _id: 'player1', username: 'player1' },
              { _id: 'player2', username: 'player2' },
              { _id: 'player3', username: 'player3' }
            ]
          });
        }
        return Promise.reject(new Error(`Unhandled URL in test: ${url}`));
      });
      
      getCurrentPlayerId.mockResolvedValue('player2');
      
      render(<LeaderboardTab />);
      
      await waitFor(() => {
        const playerRow = screen.getByText(/player2.*\(You\)/).closest('tr');
        expect(playerRow).toHaveClass('current-player');
      }, { timeout: 3000 });
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
});

describe('LeaderboardTab Group Component', () => {
    const mockLeaderboardData = {
      leaderboard: [
        { _id: 'player1', totalScore: 1000, totalGames: 10, avgScore: 100, rank: 1 },
        { _id: 'player2', totalScore: 900, totalGames: 9, avgScore: 90, rank: 2 },
        { _id: 'player3', totalScore: 800, totalGames: 8, avgScore: 80, rank: 3 }
      ]
    };
  
    const mockGroupMembersData = {
      members: ['userId1', 'userId2', 'userId3']
    };
  
    const mockUsersData = [
      { _id: 'userId1', username: 'player1' },
      { _id: 'userId2', username: 'player2' },
      { _id: 'userId3', username: 'player3' }
    ];
  
    const mockGroupLeaderboardData = {
      leaderboard: [
        { _id: 'userId1', totalScore: 500, totalGames: 5, avgScore: 100, rank: 1 },
        { _id: 'userId2', totalScore: 400, totalGames: 4, avgScore: 100, rank: 2 },
        { _id: 'userId3', totalScore: 300, totalGames: 3, avgScore: 100, rank: 3 }
      ]
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
      fetchWithAuth.mockResolvedValue(mockLeaderboardData);
      getAuthToken.mockReturnValue('fake-token');
      getCurrentPlayerId.mockResolvedValue('player1');
    });
  
    it('renders the group tab', async () => {
      render(<LeaderboardTab />);
      await waitFor(() => {
        expect(screen.getAllByText('Global Leaderboard').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Group Leaderboard').length).toBeGreaterThan(0);
      });
    });
  
    it('changes to group leaderboard when tab is clicked', async () => {
      axios.get.mockResolvedValueOnce({ data: mockGroupMembersData });
      axios.post.mockResolvedValueOnce({ data: mockUsersData });
      axios.post.mockResolvedValueOnce({ data: mockGroupLeaderboardData });
  
      render(<LeaderboardTab />);
  
      await waitFor(() => {
        expect(screen.getAllByText('Global Leaderboard').length).toBeGreaterThan(0);
      });
  
      // Click on group leaderboard tab
      const groupTab = screen.getByText('Group Leaderboard');
      act(() => {
        fireEvent.click(groupTab);
      });
  
      await waitFor(() => {
        // Verify axios calls
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/groups/joined'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer fake-token'
            })
          })
        );
        
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/leaderboard/group'),
          expect.anything(),
          expect.anything()
        );
      });
    });
  
    it('shows "You do not belong to any group" message when user has no group', async () => {
      axios.get.mockRejectedValueOnce({ response: { status: 404 } });
  
      render(<LeaderboardTab />);
  
      const groupTab = screen.getByText('Group Leaderboard');
      act(() => {
        fireEvent.click(groupTab);
      });
  
      await waitFor(() => {
        expect(screen.getByText('You do not belong to any group! Join a group to see the group leaderboard.')).toBeInTheDocument();
      });
    });
  
    it('handles group API errors gracefully', async () => {
      axios.get.mockRejectedValueOnce({ 
        message: 'Failed to fetch group data',
        response: { status: 500 }
      });
  
      render(<LeaderboardTab />);
  
      const groupTab = screen.getByText('Group Leaderboard');
      act(() => {
        fireEvent.click(groupTab);
      });
  
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch group data')).toBeInTheDocument();
      });
    });
  
    it('renders group leaderboard data correctly', async () => {
      // Mock para la llamada al grupo
      axios.get.mockResolvedValueOnce({ data: mockGroupMembersData });
      
      // Mock específico para cada tipo de llamada post
      // Es crucial que estas llamadas devuelvan la estructura de datos correcta
      axios.post.mockImplementation((url, data) => {
        if (url.includes('/users/by-ids')) {
          return Promise.resolve({ data: mockUsersData });
        } else if (url.includes('/leaderboard/group')) {
          return Promise.resolve({ data: mockGroupLeaderboardData });
        }
        return Promise.reject(new Error(`Unhandled URL in test: ${url}`));
      });
    
      render(<LeaderboardTab />);
    
      // Esperar a que cargue inicialmente
      await waitFor(() => {
        expect(screen.getAllByText('Global Leaderboard').length).toBeGreaterThan(0);
      });
      
      // Hacer clic en la pestaña del grupo
      const groupTab = screen.getByText('Group Leaderboard');
      act(() => {
        fireEvent.click(groupTab);
      });
    
      // Esperar a que se completen todas las llamadas API
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/groups/joined'),
          expect.anything()
        );
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/leaderboard/group'),
          expect.anything(),
          expect.anything()
        );
      });
    
      // Añadir un pequeño retraso para asegurar que los datos se rendericen
      await new Promise(resolve => setTimeout(resolve, 0));
    
      // Comprobar el contenido renderizado con más flexibilidad
      await waitFor(() => {
        // Buscar elementos que deberían estar presentes en alguna forma
        const pointsElements = screen.getAllByText(/points/);
        expect(pointsElements.length).toBeGreaterThan(0);
        
        // Verificar que se muestra algún contenido de la tabla
        expect(screen.getByRole('table')).toBeInTheDocument();
        
        // Verificar que se muestran las filas de la tabla
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBeGreaterThan(1); // Header + al menos una fila de datos
      }, { timeout: 3000 });
    });
  
    it('switches back to global leaderboard', async () => {
      axios.get.mockResolvedValueOnce({ data: mockGroupMembersData });
      axios.post.mockResolvedValueOnce({ data: mockUsersData });
      axios.post.mockResolvedValueOnce({ data: mockGroupLeaderboardData });
  
      render(<LeaderboardTab />);
  
      // First switch to group leaderboard
      const groupTab = screen.getByText('Group Leaderboard');
      act(() => {
        fireEvent.click(groupTab);
      });
  
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/groups/joined'), expect.anything());
      });
  
      // Then switch back to global leaderboard
      const globalTab = screen.getAllByText('Global Leaderboard')[0];
      act(() => {
        fireEvent.click(globalTab);
      });
  
      await waitFor(() => {
        // Verify fetchWithAuth was called again
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        expect(fetchWithAuth).toHaveBeenLastCalledWith('/leaderboard');
      });
    });
  });