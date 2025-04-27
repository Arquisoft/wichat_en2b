import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import HostManager from '../components/wihoot/host/HostManager';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../utils/api-fetch-auth.js';
import '@testing-library/jest-dom';

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
                        { question_id: 'q2', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            if (url.includes('/next')) {
                return Promise.resolve({
                    currentQuestionIndex: 1,
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Current Standings/i)).toBeInTheDocument();
        });
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
            if (url.includes('/end')) {
                return Promise.resolve({
                    status: 'finished',
                    players: [],
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /End Quiz/i })).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /End Quiz/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Quiz Completed')).toBeInTheDocument();
            expect(localStorage.removeItem).toHaveBeenCalledWith(
                expect.stringContaining('quizTimer_TESTCODE_mock-user-id')
            );
        });
    });

    it('handles leaderboard next API error', async () => {
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
                        { question_id: 'q2', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            if (url.includes('/next')) {
                throw new Error('Failed to move to next question');
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Current Standings/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to move to next question')).toBeInTheDocument();
        });
    });

    it('handles end quiz API error', async () => {
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
            if (url.includes('/end')) {
                throw new Error('Failed to end quiz');
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /End Quiz/i })).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /End Quiz/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to end quiz')).toBeInTheDocument();
        });
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
                        { question_id: 'q2', answers: ['A', 'B', 'C', 'D'], image_name: '/image.png' },
                    ],
                });
            }
            if (url.includes('/next')) {
                return Promise.resolve({
                    currentQuestionIndex: 1,
                });
            }
            return Promise.resolve(null);
        });

        await act(async () => {
            render(<HostManager />);
            jest.advanceTimersByTime(60000); // 60 seconds
        });

        await waitFor(() => {
            expect(screen.getByText(/Current Standings/i)).toBeInTheDocument();
            expect(localStorage.removeItem).toHaveBeenCalledWith(
                expect.stringContaining('quizTimer_TESTCODE_mock-user-id')
            );
        });
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