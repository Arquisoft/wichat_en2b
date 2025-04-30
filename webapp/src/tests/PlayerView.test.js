import React from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api-fetch-auth';

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PlayerView from "@/components/wihoot/play/PlayerView"
import io from "socket.io-client";

// Mock dependencies
jest.mock('next/router', () => ({
    useRouter: jest.fn(),
}));
jest.mock('socket.io-client', () => {
    const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
    };
    return jest.fn(() => mockSocket);
});
jest.mock('@/utils/api-fetch-auth', () => ({
    fetchWithAuth: jest.fn(),
}));
jest.mock('@mui/material', () => ({
    ...jest.requireActual('@mui/material'),
    Container: ({ children }) => <div>{children}</div>,
    Box: ({ children, ...props }) => <div {...props}>{children}</div>,
    Typography: ({ children, ...props }) => <span {...props}>{children}</span>,
    Card: ({ children }) => <div>{children}</div>,
    CardHeader: ({ title }) => <div>{title}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Alert: ({ children, severity }) => <div data-severity={severity}>{children}</div>,
    List: ({ children }) => <ul>{children}</ul>,
    ListItem: ({ children }) => <li>{children}</li>,
    ListItemText: ({ primary, secondary }) => (
        <div>
            <span>{primary}</span>
            {secondary}
        </div>
    ),
    Badge: ({ children, badgeContent }) => (
        <div>
            {children}
            <span>{badgeContent}</span>
        </div>
    ),
    Grid: ({ children }) => <div>{children}</div>,
    CircularProgress: () => <div>Loading...</div>,
    LinearProgress: ({ variant, value }) => <div data-variant={variant} data-value={value}></div>,
}));
jest.mock('@/components/game/InGameChat', () => () => <div>InGameChat</div>);
jest.mock('@/components/wihoot/game/FinishResults', () => () => <div>FinishResults</div>);

// Mock global fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => (store[key] = value.toString())),
        removeItem: jest.fn((key) => delete store[key]),
        clear: jest.fn(() => (store = {})),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
    writable: true,
    value: 'token=mock-token',
});

describe('PlayerView Component', () => {
    const mockRouter = {
        query: { code: '1234', playerId: 'player1' },
        push: jest.fn(),
    };
    const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
    };
    const mockFetchWithAuth = fetchWithAuth;
    const mockIo = io;

    beforeEach(() => {
        jest.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
        mockIo.mockReturnValue(mockSocket);
        mockFetchWithAuth.mockResolvedValue({ username: 'testUser' });
        global.fetch.mockClear();
        localStorageMock.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('fetches user and session data on mount', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'waiting',
                            players: [{ id: 'player1', username: 'testUser' }],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60 }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        // Ensure fetchWithAuth returns the correct username
        mockFetchWithAuth.mockResolvedValue({ username: 'testUser' });

        // Render the component
        render(<PlayerView />);

        // Wait for the API calls to be made
        await waitFor(() => {
            expect(mockFetchWithAuth).toHaveBeenCalledWith('/token/username');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/shared-quiz/1234/status'),
                expect.any(Object)
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/internal/quizdata/1234'),
                expect.any(Object)
            );
        });

        // Wait for the username to appear in the rendered output, indicating state update
        await waitFor(() => {
            expect(screen.getByText('WiHoot - Quiz')).toBeInTheDocument();
        });

        // Manually trigger the socket connect event after state update
        await act(async () => {
            const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')[1];
            if (connectHandler) {
                connectHandler();
            } else {
                throw new Error('Connect handler not found');
            }
        });

        // Verify the join-session emission
        expect(mockSocket.emit).toHaveBeenCalledWith('join-session', {
            code: '1234',
            playerId: 'player1',
            username: '',
        });
    });
    it('renders waiting room when sessionStatus is waiting', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'waiting',
                            players: [{ id: 'player1', username: 'testUser' }],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60 }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(screen.getByText('Get ready for the quiz!🚀')).toBeInTheDocument();
            expect(screen.getByText('1234')).toBeInTheDocument();
            expect(screen.getByText('testUser')).toBeInTheDocument();
            expect(screen.getByText('You')).toBeInTheDocument();
        });
    });

    it('renders active quiz when sessionStatus is active and not waiting', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [{ id: 'player1', username: 'testUser', answers: [] }],
                            currentQuestionIndex: 0,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [
                                {
                                    question_id: 'q1',
                                    question: 'What is 2+2?',
                                    answers: ['4', '5', '6', '7'],
                                    image_name: '/image.jpg',
                                },
                            ],
                            quizMetaData: [{ timePerQuestion: 60, category: 'Math' }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
            expect(screen.getByText('4')).toBeInTheDocument();
            expect(screen.getByText('InGameChat')).toBeInTheDocument();
        });
    });

    it('handles answer submission', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [{ id: 'player1', username: 'testUser', answers: [] }],
                            currentQuestionIndex: 0,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [
                                {
                                    question_id: 'q1',
                                    question: 'What is 2+2?',
                                    answers: ['4', '5', '6', '7'],
                                    image_name: '/image.jpg',
                                },
                            ],
                            quizMetaData: [{ timePerQuestion: 60, category: 'Math' }],
                        }),
                });
            }
            if (url.includes('/question/validate')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ isCorrect: true, correctAnswer: '4' }),
                });
            }
            if (url.includes('/shared-quiz/1234/answer')) {
                return Promise.resolve({ ok: true });
            }
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [{ id: 'player1', username: 'testUser', answers: [] }],
                            currentQuestionIndex: 0,
                            waitingForNext: false,
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        // Wait for the question to render
        await waitFor(() => {
            expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
            expect(screen.getByText('4')).toBeInTheDocument();
        });

        // Simulate clicking the answer
        await act(async () => {
            fireEvent.click(screen.getByText('4'));
        });

    });

    it('renders leaderboard when waiting for next question', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [
                                { id: 'player1', username: 'testUser', score: 100, answers: [] },
                                { id: 'player2', username: 'otherUser', score: 50, answers: [] },
                            ],
                            currentQuestionIndex: 0,
                            waitingForNext: true,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60 }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(screen.getByText('Leaderboard - Question 1 Results')).toBeInTheDocument();
            expect(screen.getByText('#1 testUser')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('#2 otherUser')).toBeInTheDocument();
            expect(screen.getByText('50')).toBeInTheDocument();
        });
    });

    it('renders finished quiz when sessionStatus is finished', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'finished',
                            players: [
                                {
                                    id: 'player1',
                                    username: 'testUser',
                                    score: 100,
                                    answers: [{ questionId: 'q1', isCorrect: true }],
                                },
                            ],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60, category: 'Math' }],
                        }),
                });
            }
            if (url.includes('/game')) {
                return Promise.resolve({ ok: true });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(screen.getByText('Quiz Completed')).toBeInTheDocument();
            expect(screen.getByText('#1 testUser')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('FinishResults')).toBeInTheDocument();
        });
    });

    it('handles socket session-started event', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'waiting',
                            players: [{ id: 'player1', username: 'testUser' }],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60 }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('session-started', expect.any(Function));
        });

        const sessionStartedHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'session-started'
        )[1];

        act(() => {
            sessionStartedHandler({ currentQuestionIndex: 0 });
        });

        await waitFor(() => {
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                expect.stringContaining('startTime-1234-player1'),
                expect.any(String)
            );
        });
    });

    it('handles error state', async () => {
        mockFetchWithAuth.mockRejectedValue(new Error('Authentication error'));
        render(<PlayerView />);

        await waitFor(() => {
            expect(screen.getByText('Authentication error. Please log in again.')).toBeInTheDocument();
        });
    });

    it('saves game data when quiz ends', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'finished',
                            players: [
                                {
                                    id: 'player1',
                                    username: 'testUser',
                                    score: 100,
                                    answers: [{ questionId: 'q1', isCorrect: true }],
                                },
                            ],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60, category: 'Math' }],
                        }),
                });
            }
            if (url.includes('/game')) {
                return Promise.resolve({ ok: true });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/game'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-token',
                    }),
                })
            );
        });
    });

    it('updates timer correctly', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [{ id: 'player1', username: 'testUser', answers: [] }],
                            currentQuestionIndex: 0,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [
                                {
                                    question_id: 'q1',
                                    question: 'What is 2+2?',
                                    answers: ['4', '5', '6', '7'],
                                    image_name: '/image.jpg',
                                },
                            ],
                            quizMetaData: [{ timePerQuestion: 10, category: 'Math' }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);

        await waitFor(() => {
            expect(screen.getByText(/Time left: 10s/)).toBeInTheDocument();
        });

        act(() => {
            jest.advanceTimersByTime(5000);
        });

        await waitFor(() => {
            expect(screen.getByText(/Time left: 5s/)).toBeInTheDocument();
        });
    });

    it('renders disconnected view when the error is: "The host has left the session"', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'waiting',
                            players: [{ id: 'player1', username: 'testUser' }],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60 }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });
        mockFetchWithAuth.mockResolvedValue({ username: 'testUser' });

        render(<PlayerView />);

        // Wait for initial render and socket setup
        await waitFor(() => {
            expect(screen.getByText('Get ready for the quiz!🚀')).toBeInTheDocument();
            expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        });

        // Simulate socket connection
        await act(async () => {
            const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
            const connectHandler = connectCall?.[1];
            if (connectHandler) {
                connectHandler();
            } else {
                throw new Error('connect handler not found');
            }
        });

        // Simulate host-disconnected event
        await act(async () => {
            const hostDisconnectedCall = mockSocket.on.mock.calls.find(
                (call) => call[0] === 'host-disconnected'
            );
            const errorHandler = hostDisconnectedCall?.[1];
            if (errorHandler) {
                errorHandler({ message: 'The host has left the session' });
            } else {
                throw new Error('host-disconnected handler not found');
            }
        });

        // Wait for disconnected view
        await waitFor(
            () => {
                expect(screen.getByText('Host Disconnected')).toBeInTheDocument();
                expect(screen.getByText('The host has left the session')).toBeInTheDocument();
            },
            { timeout: 2000 }
        );

        // Verify redirect
        act(() => {
            jest.advanceTimersByTime(3000);
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
    it('shows loading spinner if there is no question', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [{ id: 'player1', username: 'testUser', answers: [] }],
                            currentQuestionIndex: 1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [
                                {
                                    question_id: 'q1',
                                    question: 'What is 2+2?',
                                    answers: ['4', '5', '6', '7'],
                                    image_name: '/image.jpg',
                                },
                            ],
                            quizMetaData: [{ timePerQuestion: 60, category: 'Math' }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(<PlayerView />);
        await waitFor(() => {
            expect(screen.getByText('Loading your quiz...')).toBeInTheDocument();
        });
    });
    it('handles socket error event and redirects to home', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'waiting',
                            players: [{ id: 'player1', username: 'testUser' }],
                            currentQuestionIndex: -1,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [],
                            quizMetaData: [{ timePerQuestion: 60 }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });
        mockFetchWithAuth.mockResolvedValue({ username: 'testUser' });

        render(<PlayerView />);

        // Wait for initial render and socket setup
        await waitFor(
            () => {
                expect(screen.getByText('Get ready for the quiz!🚀')).toBeInTheDocument();
                expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
            },
            { timeout: 3000 } // Increased timeout for async socket setup
        );

        // Simulate socket connection
        await act(async () => {
            const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
            const connectHandler = connectCall?.[1];
            if (connectHandler) {
                connectHandler();
            } else {
                throw new Error('connect handler not found');
            }
        });

        // Simulate socket error event
        await act(async () => {
            const errorCall = mockSocket.on.mock.calls.find((call) => call[0] === 'error');
            const errorHandler = errorCall?.[1];
            if (errorHandler) {
                errorHandler({ message: 'Session not found' });
            } else {
                throw new Error('error handler not found');
            }
        });

        // Verify error message and redirect
        await waitFor(
            () => {
                expect(screen.getByText('Session not found')).toBeInTheDocument();
                expect(mockRouter.push).toHaveBeenCalledWith('/');
            },
            { timeout: 2000 }
        );
    });

    it('handles socket question-changed event and updates question', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/shared-quiz/1234/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'active',
                            players: [{ id: 'player1', username: 'testUser', answers: [] }],
                            currentQuestionIndex: 0,
                            waitingForNext: false,
                        }),
                });
            }
            if (url.includes('/internal/quizdata/1234')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            quizData: [
                                {
                                    question_id: 'q1',
                                    question: 'What is 2+2?',
                                    answers: ['4', '5', '6', '7'],
                                    image_name: '/image.jpg',
                                },
                                {
                                    question_id: 'q2',
                                    question: 'What is 3+3?',
                                    answers: ['6', '7', '8', '9'],
                                    image_name: '/image2.jpg',
                                },
                            ],
                            quizMetaData: [{ timePerQuestion: 60, category: 'Math' }],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        });
        mockFetchWithAuth.mockResolvedValue({ username: 'testUser' });

        render(<PlayerView />);

        // Wait for initial question render
        await waitFor(() => {
            expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
        });

        // Simulate socket connection
        await act(async () => {
            const connectCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect');
            const connectHandler = connectCall?.[1];
            if (connectHandler) {
                connectHandler();
            } else {
                throw new Error('connect handler not found');
            }
        });

        // Simulate question-changed event
        await act(async () => {
            const questionChangedCall = mockSocket.on.mock.calls.find(
                (call) => call[0] === 'question-changed'
            );
            const questionHandler = questionChangedCall?.[1];
            if (questionHandler) {
                questionHandler({ currentQuestionIndex: 1 });
            } else {
                throw new Error('question-changed handler not found');
            }
        });

        // Verify new question and state reset
        await waitFor(
            () => {
                expect(screen.getByText('What is 3+3?')).toBeInTheDocument();
                expect(screen.getByText('6')).toBeInTheDocument();
                expect(localStorageMock.setItem).toHaveBeenCalledWith(
                    expect.stringContaining('startTime-1234-player1'),
                    expect.any(String)
                );
            },
            { timeout: 2000 }
        );
    });
});