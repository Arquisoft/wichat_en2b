import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import HostManager from '../components/wihoot/host/HostManager';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../utils/api-fetch-auth.js';
import '@testing-library/jest-dom';
import axios from "axios";
import io from "socket.io-client";


// Mock router
jest.mock('next/router', () => ({
    useRouter: jest.fn(),
}));

// Mock fetchWithAuth
jest.mock('../utils/api-fetch-auth.js', () => ({
    fetchWithAuth: jest.fn(),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => {
    const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
    };
    const io = jest.fn(() => mockSocket);
    return {
        __esModule: true,
        default: io,
        io,
    };
});

// Mock axios for fetchUserData
jest.mock('axios', () => ({
    get: jest.fn(),
    post: jest.fn(),
}));

// Mock global fetch for validateAnswers
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => (store[key] = value.toString())),
        removeItem: jest.fn((key) => delete store[key]),
        clear: jest.fn(() => (store = {})),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('HostManager', () => {
    let mockSocket;

    beforeEach(() => {
        jest.clearAllMocks();
        useRouter.mockReturnValue({
            query: { code: 'TESTCODE' },
            isReady: true,
            push: jest.fn(),
        });

        // Mock document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: 'token=mock-token',
        });

        // Mock axios.get for fetchUserData
        require('axios').get.mockResolvedValue({
            data: { _id: 'mock-user-id', username: 'mock-user' },
        });

        // Mock axios.post
        require('axios').post.mockResolvedValue({ data: {} });

        // Mock fetchWithAuth
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                        { question_id: 'q2', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            if (url.includes('/next')) {
                return Promise.resolve({
                    currentQuestionIndex: 1,
                });
            }
            if (url.includes('/start')) {
                return Promise.resolve({
                    status: 'active',
                    currentQuestionIndex: 0,
                });
            }
            if (url.includes('/end')) {
                return Promise.resolve({
                    status: 'finished',
                    players: [],
                });
            }
            return Promise.resolve(null);
        });

        // Mock global fetch
        global.fetch.mockImplementation((url) => {
            if (url.includes('/question/validate')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ correctAnswer: 'A', isCorrect: true }),
                    text: () => Promise.resolve(''),
                });
            }
            if (url.includes('/categories') || url.includes('/recentQuizzes')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([]),
                    text: () => Promise.resolve(''),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve(''),
            });
        });

        // Mock socket instance
        mockSocket = require('socket.io-client').io();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders loading spinner when loading', async () => {
        fetchWithAuth.mockImplementation((url) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    if (url.includes('/status')) {
                        resolve({
                            status: 'waiting',
                            players: [],
                            currentQuestionIndex: -1,
                        });
                    } else if (url.includes('/internal/quizdata/')) {
                        resolve({
                            quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                            quizData: [],
                        });
                    } else {
                        resolve(null);
                    }
                }, 100);
            });
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    it('shows error if no quiz code provided', async () => {
        useRouter.mockReturnValueOnce({
            query: {},
            isReady: true,
            push: jest.fn(),
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText(/Error: No valid quiz code provided/i)).toBeInTheDocument();
        });
    });

    it('renders waiting room when session is waiting', async () => {
        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Waiting for players...')).toBeInTheDocument();
        });
    });

    it('renders waiting room with players', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [{ id: 'player1', username: 'Player1' }],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Players (1)')).toBeInTheDocument();
            expect(screen.getByText('Player1')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Start Quiz/i })).not.toBeDisabled();
        });
    });

    it('renders active quiz when session is active', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'active',
                    players: [],
                    currentQuestionIndex: 0,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Answer Options')).toBeInTheDocument();
            expect(screen.getByText('Leaderboard')).toBeInTheDocument();
            expect(screen.getByText('Sample Quiz')).toBeInTheDocument();
        });
    });

    it('renders leaderboard view after next question clicked', async () => {
        // Enable fake timers for THIS specific test
        jest.useFakeTimers();

        // === Mocks required for this test ===
        // Mock router query and isReady
        useRouter.mockReturnValue({
            query: { code: "TESTCODE" },
            isReady: true,
            push: jest.fn(), // Mock push if it might be called
        });

         // Mock the axios call used by fetchUserData
         axios.get.mockResolvedValue({
             data: { _id: 'mock-user-id', username: 'HostUser' }
         });

         // Mock localStorage getItem to return null initially for timer data
         localStorageMock.getItem.mockReturnValue(null);

         // Mock document.cookie if fetchUserData accesses it directly
         Object.defineProperty(document, 'cookie', {
             writable: true,
             value: 'token=mock-token',
         });

         // Mock socket.io methods if needed for component setup/behavior
         const mockSocketOn = jest.fn();
         const mockSocketEmit = jest.fn();
         const mockSocketDisconnect = jest.fn();
         io.mockImplementation(() => ({
             on: mockSocketOn,
             emit: mockSocketEmit,
             disconnect: mockSocketDisconnect,
             connected: true,
         }));

        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                // Simulate the initial active session status
                return Promise.resolve({
                    status: 'active',
                    players: [{ id: 'player1', username: 'PlayerOne', score: 100 }], // Add a player for leaderboard
                    currentQuestionIndex: 0, // Start at the first question
                });
            }
            if (url.includes('/internal/quizdata/')) {
                // Simulate quiz data with at least two questions
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 5 }], // Short time for test timer
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                        { question_id: 'q2', answers: ['E', 'F', 'G', 'H'], image_name: '/image2.png' },
                    ],
                });
            }
             // Mock the validate endpoint, called when currentQuestionIndex changes
            if (url.includes('/question/validate')) {
                // Simulate a response for validating the first question
                return Promise.resolve({
                    question_id: 'q1',
                    correctAnswer: 'A',
                    isCorrect: true,
                });
            }
            // The /next endpoint is called by handleLeaderboardNext, not handleNextQuestion
            // We don't need this mock for the initial click to show the leaderboard.
            /*
            if (url.includes('/next')) {
                return Promise.resolve({
                    currentQuestionIndex: 1,
                });
            }
            */
            // Mock the end endpoint if the test might involve finishing the quiz
             if (url.includes('/end')) {
                  return Promise.resolve({
                     status: 'finished',
                     players: [{ id: 'player1', username: 'PlayerOne', score: 100 }],
                 });
             }

            return Promise.resolve(null); // Default return for other fetch calls
        });
        // === End of Mocks ===


        // Render the component and wait for initial data fetching to complete
        await act(async () => {
            render(<HostManager />);
        });

        // Wait for the initial active quiz view to be rendered and the button to appear
        await waitFor(() => {
             expect(screen.getByText(/Question 1 of 2/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
        });

        // Clear any timers that might have started automatically on initial render
        // (e.g., the main quiz countdown timer)
         act(() => {
             jest.clearAllTimers();
         });


        // Click the "Next Question" button. This triggers handleNextQuestion,
        // which schedules the 2-second timeout to show the leaderboard.
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));
        });

        // Advance Jest's fake timers by at least 2000 milliseconds
        // This executes the code inside the setTimeout callback,
        // which sets setShowLeaderboard(true) and triggers a re-render.
        await act(async () => {
            jest.advanceTimersByTime(2000);
        });


        // Now that the timeout has completed and the state is updated,
        // wait for the component to render the leaderboard view.
        await waitFor(() => {
            // Check for text specifically present in the leaderboard view
            expect(screen.getByText(/Current Standings/i)).toBeInTheDocument();
            // Also check for the button which should now trigger handleLeaderboardNext
             expect(screen.getByRole('button', { name: /Next Question|End Quiz/i })).toBeInTheDocument();
        });

        // Restore real timers after the test finishes
        jest.useRealTimers();
         // Clean up document.cookie mock
         Object.defineProperty(document, 'cookie', { writable: true, value: '' });
    });


    it('renders finished quiz when session is finished', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'finished',
                    players: [],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Quiz Completed')).toBeInTheDocument();
        });
    });

    it('handles authentication error in fetchUserData', async () => {
        jest.useFakeTimers();
        require('axios').get.mockRejectedValueOnce({
            response: { status: 401, data: { error: 'Authentication failed' } },
        });

        await act(async () => {
            render(<HostManager />);
            jest.runAllTimers();
        });

        await waitFor(
            () => {
                expect(screen.getByText('Authentication error. Please log in again.')).toBeInTheDocument();
            },
            { timeout: 1000 }
        );
    });

    it('handles invalid session data response', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                throw new Error('Invalid JSON response');
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to load session data')).toBeInTheDocument();
        });
    });

    it('handles missing user data', async () => {
        jest.useFakeTimers();
        require('axios').get.mockResolvedValueOnce({ data: {} });

        await act(async () => {
            render(<HostManager />);
            jest.runAllTimers();
        });

        await waitFor(
            () => {
                expect(screen.getByText('Failed to fetch host data')).toBeInTheDocument();
            },
            { timeout: 1000 }
        );
    });

    it('handles socket connect event', async () => {
        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        });

        // Simulate the connect event
        const connectCallback = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'connect'
        )[1];
        await act(async () => {
            connectCallback();
        });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('host-session', {
                code: 'TESTCODE',
                hostId: 'mock-user-id',
            });
        });
    });

    it('handles socket hosting-session event', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('hosting-session', expect.any(Function));
        });

        const hostingSessionCallback = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'hosting-session'
        )[1];

        await act(async () => {
            hostingSessionCallback({
                status: 'active',
                players: [{ id: 'player1', username: 'Player1' }],
                currentQuestionIndex: 0,
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Answer Options')).toBeInTheDocument();
            expect(localStorage.setItem).toHaveBeenCalledWith(
                expect.stringContaining('quizTimer_TESTCODE_mock-user-id'),
                expect.any(String)
            );
        });
    });

    it('handles socket player-joined event', async () => {
        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('player-joined', expect.any(Function));
        });

        const playerJoinedCallback = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'player-joined'
        )[1];

        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [{ id: 'player1', username: 'Player1' }],
                    currentQuestionIndex: -1,
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            playerJoinedCallback({ playerId: 'player1' });
        });

        await waitFor(() => {
            expect(screen.getByText('Players (1)')).toBeInTheDocument();
            expect(screen.getByText('Player1')).toBeInTheDocument();
        });
    });

    it('handles socket player-left event', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [{ id: 'player1', username: 'Player1' }],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('player-left', expect.any(Function));
        });

        const playerLeftCallback = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'player-left'
        )[1];

        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [],
                    currentQuestionIndex: -1,
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            playerLeftCallback({ playerId: 'player1' });
        });

        await waitFor(() => {
            expect(screen.getByText('Players (0)')).toBeInTheDocument();
            expect(screen.getByText('No players have joined yet')).toBeInTheDocument();
        });
    });

    it('handles socket answer-submitted event', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'active',
                    players: [{ id: 'player1', username: 'Player1', score: 0 }],
                    currentQuestionIndex: 0,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('answer-submitted', expect.any(Function));
        });

        const answerSubmittedCallback = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'answer-submitted'
        )[1];

        await act(async () => {
            answerSubmittedCallback({ playerId: 'player1', score: 100 });
        });

        await waitFor(() => {
            expect(screen.getByText('100')).toBeInTheDocument();
        });
    });

    it('handles socket error event', async () => {
        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        const errorCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'error')[1];

        await act(async () => {
            errorCallback({ message: 'Socket error occurred' });
        });

        await waitFor(() => {
            expect(screen.getByText('Socket error occurred')).toBeInTheDocument();
        });
    });

    it('handles start quiz with players', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [{ id: 'player1', username: 'Player1' }],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            if (url.includes('/start')) {
                return Promise.resolve({
                    status: 'active',
                    currentQuestionIndex: 0,
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Start Quiz/i })).not.toBeDisabled();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Answer Options')).toBeInTheDocument();
            expect(localStorage.setItem).toHaveBeenCalledWith(
                expect.stringContaining('quizTimer_TESTCODE_mock-user-id'),
                expect.any(String)
            );
        });
    });

    it('handles start quiz with no players', async () => {
        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeDisabled();
        });
    });

    it('handles start quiz API error', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'waiting',
                    players: [{ id: 'player1', username: 'Player1' }],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            if (url.includes('/start')) {
                throw new Error('Failed to start quiz');
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Start Quiz/i })).not.toBeDisabled();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to start quiz')).toBeInTheDocument();
        });
    });

    it('handles next question with no current question', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'active',
                    players: [],
                    currentQuestionIndex: 0,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('No question available')).toBeInTheDocument();
        });
    });

    it('handles next question to end quiz', async () => {
        jest.useFakeTimers(); // Enable fake timers for this test
    
        // --- Mocks Setup ---
        // Mock fetchWithAuth for initial status and only ONE question
        fetchWithAuth.mockImplementation(async (url) => {
            if (url.includes('/status')) {
                return { status: 'active', players: [], currentQuestionIndex: 0 };
            }
            if (url.includes('/internal/quizdata/')) {
                return {
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    // Only one question in quizData
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                };
            }
            // Mock the /end call to succeed
            if (url.includes('/end')) {
                return { status: 'finished', players: [] };
            }
            // Mock /validate call if needed within handleNextQuestion before timeout
             if (url.includes('/question/validate')) {
                 return { ok: true, json: async () => ({ correctAnswer: 'A', isCorrect: true }) };
             }
            return null; // Fallback
        });
        // Ensure global fetch is also appropriately mocked if /validate isn't handled above
        global.fetch.mockImplementation(async (url) => {
             if (url.includes('/question/validate')) {
                return { ok: true, json: async () => ({ correctAnswer: 'A', isCorrect: true }) };
            }
            return { ok: true, json: async () => ({}) };
        });
    
    
        // --- Test Execution ---
        await act(async () => {
            render(<HostManager />);
        });
    
        // Wait for the active quiz view with the "End Quiz" button
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /End Quiz/i })).toBeInTheDocument();
            expect(screen.getByText('Question 1 of 1')).toBeInTheDocument(); // Verify it knows it's the last question
        });
    
        // Click the "End Quiz" button (triggers handleNextQuestion)
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /End Quiz/i }));
            // Allow validate fetch to potentially resolve if it runs before timeout
            await Promise.resolve();
        });
    
        // Advance the timer by the 2-second delay in handleNextQuestion
        await act(async () => {
            jest.advanceTimersByTime(2000);
            // Allow the async handleEndQuiz fetch call to resolve
             await Promise.resolve();
        });
    
        // Now wait for the "Quiz Completed" screen
        await waitFor(() => {
            expect(screen.getByText('Quiz Completed')).toBeInTheDocument();
            expect(screen.getByText('Final Results')).toBeInTheDocument();
            // Check timer cleared
            expect(localStorage.removeItem).toHaveBeenCalledWith(
                expect.stringContaining('quizTimer_TESTCODE_mock-user-id')
            );
        });
    
        jest.useRealTimers(); // Disable fake timers
    });


    it('handles end quiz API error', async () => {
        jest.useFakeTimers(); // Enable fake timers
    
        // --- Mocks Setup ---
        // Mock fetchWithAuth for initial status and ONE question
        fetchWithAuth.mockImplementation(async (url) => {
            if (url.includes('/status')) {
                return { status: 'active', players: [], currentQuestionIndex: 0 };
            }
            if (url.includes('/internal/quizdata/')) {
                return {
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    // Only one question
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                };
            }
            // Mock the /end call to *fail*
            if (url.includes('/end')) {
                throw new Error('Failed to end quiz');
            }
             // Mock /validate call if needed within handleNextQuestion before timeout
             if (url.includes('/question/validate')) {
                 return { ok: true, json: async () => ({ correctAnswer: 'A', isCorrect: true }) };
             }
            return null; // Fallback
        });
         // Ensure global fetch is also appropriately mocked if /validate isn't handled above
         global.fetch.mockImplementation(async (url) => {
              if (url.includes('/question/validate')) {
                 return { ok: true, json: async () => ({ correctAnswer: 'A', isCorrect: true }) };
             }
             return { ok: true, json: async () => ({}) };
         });
    
        // --- Test Execution ---
        await act(async () => {
            render(<HostManager />);
        });
    
        // Wait for the active quiz view with the "End Quiz" button
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /End Quiz/i })).toBeInTheDocument();
             expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
        });
    
        // Click the "End Quiz" button (triggers handleNextQuestion)
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /End Quiz/i }));
             // Allow validate fetch to potentially resolve
            await Promise.resolve();
        });
    
        // Advance the timer by the 2-second delay
        await act(async () => {
            jest.advanceTimersByTime(2000);
             // Allow the async handleEndQuiz fetch call (which throws error) to settle
            await Promise.resolve();
        });
    
        // Wait for the error message to be displayed
        await waitFor(() => {
            const alert = screen.getByRole('alert');
            expect(alert).toHaveTextContent('Failed to end quiz');
            // expect(screen.getByText('Failed to end quiz')).toBeInTheDocument();
        });
    
         // Ensure we are still on the Active Quiz view (or wherever the error leaves us)
         // The component might stay on the active screen or leaderboard depending on exact error handling state update
         expect(screen.getByRole('button', { name: /End Quiz/i })).toBeInTheDocument();
    
    
        jest.useRealTimers(); // Disable fake timers
    });
    

    it('handles timer persistence with stored data', async () => {
        jest.useFakeTimers();
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'active',
                    players: [],
                    currentQuestionIndex: 0,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            return Promise.resolve(null);
        });

        localStorage.getItem.mockReturnValueOnce(
            JSON.stringify({
                questionIndex: 0,
                startTime: Date.now() - 10000, // 10 seconds elapsed
            })
        );

        await act(async () => {
            render(<HostManager />);
            jest.advanceTimersByTime(100);
        });

        await waitFor(() => {
            expect(screen.getByText(/Time left: 50s/i)).toBeInTheDocument();
        });
    });

    it('handles timer expiration', async () => {
        // Enable fake timers for this test
        jest.useFakeTimers();
    
        // --- Mocks Setup ---
        // Mock router query and isReady
        useRouter.mockReturnValue({
            query: { code: "TESTCODE" },
            isReady: true,
            push: jest.fn(), // Mock push if it might be called
        });
    
         // Mock the axios call used by fetchUserData (called in initial useEffect)
         axios.get.mockResolvedValue({
             data: { _id: 'mock-user-id', username: 'HostUser' }
         });
    
         // Mock localStorage getItem to return null initially for timer data
         localStorageMock.getItem.mockReturnValue(null);
         // Mock localStorage setItem - called when timer starts
         localStorageMock.setItem.mockImplementation(jest.fn());
         // Mock localStorage removeItem - called when timer is cleared
         localStorageMock.removeItem.mockImplementation(jest.fn());
    
    
         // Mock document.cookie as fetchUserData uses it
         Object.defineProperty(document, 'cookie', {
             writable: true,
             value: 'token=mock-token',
         });
    
         // Mock socket.io methods and the instance creation
         // Ensure you are using the mockSocket instance created in beforeEach
         // Access the mocked methods from the mockSocket instance declared in the describe block
         const mockSocketOn = mockSocket.on;
         const mockSocketEmit = mockSocket.emit;
         const mockSocketDisconnect = mockSocket.disconnect;
    
    
        // Mock fetchWithAuth calls, ensuring the /status endpoint returns 'active'
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                // Crucially, simulate the initial session status as 'active'
                return Promise.resolve({
                    status: 'active',
                    players: [{ id: 'player1', username: 'PlayerOne', score: 0 }], // Add a player
                    currentQuestionIndex: 0, // Start at the first question (index 0)
                });
            }
            if (url.includes('/internal/quizdata/')) {
                // Simulate quiz data with two questions
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }], // Use 60s
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                        { question_id: 'q2', answers: ['E', 'F', 'G', 'H'], image_name: '/image2.png' },
                    ],
                });
            }
             // Mock the validate endpoint, called when currentQuestionIndex changes
            if (url.includes('/question/validate')) {
             // Provide a mock response for validating the current question (Q1)
                return Promise.resolve({
                    question_id: 'q1',
                    correctAnswer: 'A',
                    isCorrect: true,
                });
            }
            // Mock the /end endpoint to prevent test failure if called,
            // even if it shouldn't be called upon Q1 timer expiration in this scenario.
             if (url.includes('/end')) {
                  return Promise.resolve({
                     status: 'finished',
                     players: [{ id: 'player1', username: 'PlayerOne', score: 100 }], // Final scores
                 });
             }
    
            return Promise.resolve(null); // Default for unhandled URLs
        });
        // --- End of Mocks Setup ---
    
    
        // --- Test Execution ---
        await act(async () => {
            render(<HostManager />);
        });
    
        // Wait for the active quiz view to be initially rendered
        await waitFor(() => {
            expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
            expect(screen.getByText(/Time left: \d+s/i)).toBeInTheDocument();
             // Check for the presence of an element specific to the active view
             expect(screen.getByText('Answer Options')).toBeInTheDocument();
        });
    
        // Advance timers to trigger the timer expiration (which calls handleNextQuestion)
        await act(async () => {
            // Advance exactly to timer expiration (60 seconds)
            // The interval timer will fire, leading to time <= 0, which calls handleNextQuestion
            jest.advanceTimersByTime(60000);
            // Flush any pending microtasks triggered by the timer callback
            await Promise.resolve();
        });
    
        // The handleNextQuestion function scheduled a setTimeout for 2000ms (2 seconds)
        // that sets showLeaderboard(true).
        // Now, advance timers again to trigger that setTimeout and process its state update.
        await act(async () => {
             // Advance by the duration of the setTimeout
             jest.advanceTimersByTime(2000);
             // Flush any pending microtasks triggered by the setTimeout callback
             await Promise.resolve();
         });
    
    
        // Wait for an element from the active view to disappear.
        // This checks that the component has transitioned away from the active state.
        // If this waitFor passes, it means showLeaderboard state successfully changed
        // and triggered a re-render that removed the active view elements.
         await waitFor(() => {
             expect(screen.queryByText('Answer Options')).not.toBeInTheDocument();
         }, { timeout: 5000 }); // Increased timeout just in case
    
    
        // Now, wait specifically for the elements of the *leaderboard* view to appear.
        // This should only pass after the component has transitioned to the leaderboard state.
        await waitFor(() => {
            // Check for text specific to the leaderboard view
            expect(screen.getByText(/Current Standings/i)).toBeInTheDocument();
            // Check the specific leaderboard title for the completed question
            expect(screen.getByText(/Leaderboard - Question 1 Results/i)).toBeInTheDocument();
            // Check that the timer data for Q1 was cleared from localStorage
            expect(localStorage.removeItem).toHaveBeenCalledWith(
                expect.stringContaining('quizTimer_TESTCODE_mock-user-id')
            );
            // Check the button text on the leaderboard view, ready to move to the next question
            expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
             // Ensure the component is not in the finished state yet
             expect(screen.queryByText(/Quiz Completed/i)).not.toBeInTheDocument();
        });
    
        // Restore real timers after the test finishes
        jest.useRealTimers();
        // Clean up document.cookie mock
        Object.defineProperty(document, 'cookie', { writable: true, value: '' });
    });


    it('handles validate answers error', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'active',
                    players: [],
                    currentQuestionIndex: 0,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [
                        { question_id: 'q1', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            return Promise.resolve(null);
        });

        global.fetch.mockImplementationOnce((url) => {
            if (url.includes('/question/validate')) {
                throw new Error('Validation failed');
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve(''),
            });
        });

        jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Answer Options')).toBeInTheDocument();
            expect(console.error).toHaveBeenCalledWith('Error validating answers:', expect.any(Error));
        });

        console.error.mockRestore();
    });

    it('renders finished quiz with players', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/status')) {
                return Promise.resolve({
                    status: 'finished',
                    players: [{ id: 'player1', username: 'Player1', score: 100 }],
                    currentQuestionIndex: -1,
                });
            }
            if (url.includes('/internal/quizdata/')) {
                return Promise.resolve({
                    quizMetaData: [{ quizName: 'Sample Quiz', timePerQuestion: 60 }],
                    quizData: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByText('Quiz Completed')).toBeInTheDocument();
            expect(screen.getByText('#1 Player1')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
        });
    });
});