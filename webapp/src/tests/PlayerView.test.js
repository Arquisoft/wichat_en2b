import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PlayerView from "@/components/wihoot/play/PlayerView"
import fetchMock from "jest-fetch-mock";
import mockRouter from "next-router-mock";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";
import * as apiFetchAuth from "@/utils/api-fetch-auth";
import io from "socket.io-client";

// Enable fetch mocking
fetchMock.enableMocks();

// Mock dependencies
jest.mock("next/router", () => require("next-router-mock"));
jest.mock("@/utils/api-fetch-auth");
jest.mock("socket.io-client");
jest.mock("@/components/game/InGameChat", () => () => <div data-testid="ingame-chat">Mocked Chat</div>);

// Mock document.cookie
Object.defineProperty(document, "cookie", {
    writable: true,
    value: "token=mock-token",
});

// Mock socket.io-client
const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
};

describe("PlayerView Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.resetMocks();
        apiFetchAuth.fetchWithAuth.mockReset();
        mockRouter.setCurrentUrl("/wihoot/player?code=ABC123&playerId=player123");
        io.mockReturnValue(mockSocket);
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("renders loading state when router is not ready", async () => {
        mockRouter.setCurrentUrl("/wihoot/player");
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });
    });

    it("renders waiting room for non-guest player", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Waiting for Host to Start")).toBeInTheDocument();
            expect(screen.getByText("You've joined with code:")).toBeInTheDocument();
            expect(screen.getByText("ABC123")).toBeInTheDocument();
            expect(screen.getByText("Players (1)")).toBeInTheDocument();
            expect(screen.getByText("PlayerUser")).toBeInTheDocument();
            expect(screen.getByText("You")).toBeInTheDocument();
        });
    });

    it("renders waiting room for guest player", async () => {
        mockRouter.setCurrentUrl("/wihoot/player?code=ABC123&playerId=guest_123");
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                code: "ABC123",
                status: "waiting",
                players: [{ id: "guest_123", username: "GuestUser", isGuest: true, score: 0 }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                code: "ABC123",
                status: "waiting",
                players: [{ id: "guest_123", username: "GuestUser", isGuest: true, score: 0 }],
                currentQuestionIndex: -1,
            }); // For joined-session

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Waiting for Host to Start")).toBeInTheDocument();
            expect(screen.getByText("GuestUser")).toBeInTheDocument();
            expect(screen.getByText("Guest")).toBeInTheDocument();
            expect(screen.getByText("You")).toBeInTheDocument();
        });
    });

    it("renders active quiz state with question and options", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            }); // For joined-session

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Question 1")).toBeInTheDocument();
            expect(screen.getByText("Sample Question")).toBeInTheDocument();
            expect(screen.getByText("Your Score")).toBeInTheDocument();
            expect(screen.getByText("100")).toBeInTheDocument();
            expect(screen.getByText("A")).toBeInTheDocument();
            expect(screen.getByText("B")).toBeInTheDocument();
            expect(screen.getByText("C")).toBeInTheDocument();
            expect(screen.getByText("D")).toBeInTheDocument();
            expect(screen.getByRole("img", { name: "Question" })).toHaveAttribute(
                "src",
                "http://localhost:8000/image.jpg"
            );
        });
    });

    it("submits correct answer and shows success alert", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 200 }],
            })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            }); // For joined-session

        fetchMock.mockResponseOnce(
            JSON.stringify({ isCorrect: true, correctAnswer: "A" }),
            { status: 200 }
        );

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByText("A"));
        });

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                "http://localhost:8000/question/validate",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question_id: "q1",
                        selected_answer: "A",
                    }),
                })
            );
            expect(fetchMock).toHaveBeenCalledWith(
                "http://localhost:8000/shared-quiz/ABC123/answer",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining('"playerId":"player123"'),
                })
            );
            expect(screen.getByText("Great job! You got it right!")).toBeInTheDocument();
            expect(screen.getByText("200")).toBeInTheDocument();
        });
    });

    it("submits incorrect answer and shows error alert", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
            })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            }); // For joined-session

        fetchMock.mockResponseOnce(
            JSON.stringify({ isCorrect: false, correctAnswer: "B" }),
            { status: 200 }
        );

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByText("A"));
        });

        await waitFor(() => {
            expect(screen.getByText("Oops! You didn't guess this one.")).toBeInTheDocument();
            expect(screen.getByText("100")).toBeInTheDocument();
        });
    });

    it("disables answer buttons after submission", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 200 }],
            })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 0,
            }); // For joined-session

        fetchMock.mockResponseOnce(
            JSON.stringify({ isCorrect: true, correctAnswer: "A" }),
            { status: 200 }
        );

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByText("A"));
        });

        await waitFor(() => {
            expect(screen.getByText("A")).toBeDisabled();
            expect(screen.getByText("B")).toBeDisabled();
            expect(screen.getByText("C")).toBeDisabled();
            expect(screen.getByText("D")).toBeDisabled();
        });
    });

    it("renders finished quiz state with final results", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "finished",
                players: [
                    { id: "player123", username: "PlayerUser", isGuest: false, score: 200 },
                    { id: "player456", username: "OtherPlayer", isGuest: false, score: 150 },
                ],
                currentQuestionIndex: 1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "finished",
                players: [
                    { id: "player123", username: "PlayerUser", isGuest: false, score: 200 },
                    { id: "player456", username: "OtherPlayer", isGuest: false, score: 150 },
                ],
                currentQuestionIndex: 1,
            }); // For joined-session

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Quiz Completed")).toBeInTheDocument();
            expect(screen.getByText("Final Results")).toBeInTheDocument();
            expect(screen.getByText("#1 PlayerUser")).toBeInTheDocument();
            expect(screen.getByText("200")).toBeInTheDocument();
            expect(screen.getByText("#2 OtherPlayer")).toBeInTheDocument();
            expect(screen.getByText("150")).toBeInTheDocument();
            expect(screen.getByText("You")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Join Another Quiz" })).toBeInTheDocument();
        });
    });

    it("navigates to join page when Join Another Quiz button is clicked", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "finished",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 200 }],
                currentQuestionIndex: 1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "finished",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 200 }],
                currentQuestionIndex: 1,
            }); // For joined-session

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole("button", { name: "Join Another Quiz" }));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe("/wihoot/join");
        });
    });

    it("handles socket events (player-joined, player-left, session-started, question-changed, session-ended)", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [
                    { id: "player123", username: "PlayerUser", isGuest: false },
                    { id: "player456", username: "OtherPlayer", isGuest: false },
                ],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Quiz Player - PlayerUser")).toBeInTheDocument();
            expect(screen.getByText("Players (1)")).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith("player-joined", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("player-left", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("session-started", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("question-changed", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("session-ended", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("joined-session", expect.any(Function));
        });

        const joinedSessionHandler = mockSocket.on.mock.calls.find((call) => call[0] === "joined-session")[1];
        await act(async () => {
            joinedSessionHandler({});
        });

        await waitFor(() => {
            expect(screen.getByText("Players (1)")).toBeInTheDocument();
        });

        const playerJoinedHandler = mockSocket.on.mock.calls.find((call) => call[0] === "player-joined")[1];
        await act(async () => {
            playerJoinedHandler({ playerId: "player456", username: "OtherPlayer" });
        });

        await waitFor(() => {
            expect(screen.getByText("Players (2)")).toBeInTheDocument();
            expect(screen.getByText("OtherPlayer")).toBeInTheDocument();
        });

        const playerLeftHandler = mockSocket.on.mock.calls.find((call) => call[0] === "player-left")[1];
        await act(async () => {
            playerLeftHandler({ playerId: "player456" });
        });

        await waitFor(() => {
            expect(screen.getByText("Players (1)")).toBeInTheDocument();
        });

        const sessionStartedHandler = mockSocket.on.mock.calls.find((call) => call[0] === "session-started")[1];
        await act(async () => {
            sessionStartedHandler({ currentQuestionIndex: 0 });
        });

        await waitFor(() => {
            expect(screen.getByText("Question 1")).toBeInTheDocument();
        });

        const questionChangedHandler = mockSocket.on.mock.calls.find((call) => call[0] === "question-changed")[1];
        await act(async () => {
            questionChangedHandler({ currentQuestionIndex: 1 });
        });

        await waitFor(() => {
            expect(screen.getByText("Loading question...")).toBeInTheDocument();
        });

        const sessionEndedHandler = mockSocket.on.mock.calls.find((call) => call[0] === "session-ended")[1];
        await act(async () => {
            sessionEndedHandler({
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 200 }],
            });
        });

        await waitFor(() => {
            expect(screen.getByText("Quiz Completed")).toBeInTheDocument();
        });
    });

    it("handles socket error event", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            const errorHandler = mockSocket.on.mock.calls.find((call) => call[0] === "error")[1];
            act(() => {
                errorHandler({ message: "Socket error occurred" });
            });
        });

        await waitFor(() => {
            expect(screen.getByText("Socket error occurred")).toBeInTheDocument();
        });
    });

    it("handles API errors during setup", async () => {
        apiFetchAuth.fetchWithAuth
            .mockRejectedValueOnce(new Error("Authentication error"))
            .mockRejectedValueOnce(new Error("Failed to fetch session data"));

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Authentication error. Please log in again.")).toBeInTheDocument();
        });
    });

    it("does not disconnect socket on component unmount due to async cleanup issue", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false }],
                currentQuestionIndex: -1,
            });

        const { unmount } = await act(async () => {
            return render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Quiz Player - PlayerUser")).toBeInTheDocument();
        });

        await act(async () => {
            unmount();
        });

        expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it("renders no question available when currentQuestion is null in active state", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({ username: "PlayerUser" })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 10,
            })
            .mockResolvedValueOnce({
                quizMetaData: [{ quizName: "Test Quiz", question: "Sample Question" }],
                quizData: [{ question_id: "q1", answers: ["A", "B", "C", "D"], image_name: "/image.jpg" }],
            })
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player123", username: "PlayerUser", isGuest: false, score: 100 }],
                currentQuestionIndex: 10,
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <PlayerView />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Loading question...")).toBeInTheDocument();
        });
    });
});