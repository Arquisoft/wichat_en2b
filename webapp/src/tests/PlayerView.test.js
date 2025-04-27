import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { fetchWithAuth } from '@/utils/api-fetch-auth';
import InGameChat from '@/components/game/InGameChat';
import FinishResults from '@/components/wihoot/game/FinishResults';

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PlayerView from "@/components/wihoot/play/PlayerView"
import fetchMock from "jest-fetch-mock";
import mockRouter from "next-router-mock";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";
import * as apiFetchAuth from "@/utils/api-fetch-auth";
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

    it('renders loading state initially', () => {
        render(<PlayerView />);
        expect(screen.getAllByText('Loading...').length).toBeGreaterThanOrEqual(2);
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
            expect(screen.getByText('WiHoot - testUser')).toBeInTheDocument();
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

        fireEvent.click(screen.getByText('Join Another Quiz'));
        expect(mockRouter.push).toHaveBeenCalledWith('/wihoot/join');
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
});