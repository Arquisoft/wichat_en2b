import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import HostManager from "@/components/wihoot/host/HostManager";
import fetchMock from "jest-fetch-mock";
import mockRouter from "next-router-mock";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";
import * as apiFetchAuth from "@/utils/api-fetch-auth";
import axios from "axios";
import io from "socket.io-client";

// Enable fetch mocking
fetchMock.enableMocks();

// Mock dependencies
jest.mock("next/router", () => require("next-router-mock"));
jest.mock("axios");
jest.mock("@/utils/api-fetch-auth");
jest.mock("socket.io-client");

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

describe("HostManager Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.resetMocks();
        axios.get.mockReset();
        axios.post.mockReset();
        apiFetchAuth.fetchWithAuth.mockReset();
        mockRouter.setCurrentUrl("/wihoot/host/manager?code=ABC123");
        io.mockReturnValue(mockSocket);
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("renders loading state when router is not ready", async () => {
        mockRouter.setCurrentUrl("/wihoot/host/manager");
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Create New Quiz")).toBeInTheDocument();
        });
    });

    it("renders error when no quiz code is provided", async () => {
        mockRouter.setCurrentUrl("/wihoot/host/manager");
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Error: No valid quiz code provided.")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Create New Quiz" })).toBeInTheDocument();
        });
    });

    it("renders waiting room when session status is waiting", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player1", username: "Player1", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Waiting for Players")).toBeInTheDocument();
            expect(screen.getByText("Share this code with players:")).toBeInTheDocument();
            expect(screen.getByText("ABC123")).toBeInTheDocument();
            expect(screen.getByText("Players (1)")).toBeInTheDocument();
            expect(screen.getByText("Player1")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Start Quiz" })).toBeInTheDocument();
        });
    });

    it("disables start quiz button when no players are present", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "waiting",
                players: [],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            const startButton = screen.getByRole("button", { name: "Start Quiz" });
            expect(startButton).toBeDisabled();
        });
    });

    it("starts quiz successfully", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player1", username: "Player1", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            })
            .mockResolvedValueOnce({
                status: "active",
                currentQuestionIndex: 0,
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole("button", { name: "Start Quiz" }));
        });

        await waitFor(() => {
            expect(apiFetchAuth.fetchWithAuth).toHaveBeenCalledWith("/shared-quiz/ABC123/start?hostId=host123");
            expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
        });
    });

    it("renders active quiz state correctly", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player1", username: "Player1", score: 100, isGuest: false }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
            expect(screen.getByText("Test Quiz")).toBeInTheDocument();
            expect(screen.getByText("A")).toBeInTheDocument();
            expect(screen.getByText("Leaderboard")).toBeInTheDocument();
            expect(screen.getByText("#1 Player1")).toBeInTheDocument();
            expect(screen.getByText("100")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "End Quiz" })).toBeInTheDocument();
        });
    });

    it("moves to next question successfully", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player1", username: "Player1", score: 100, isGuest: false }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }, { answers: ["E", "F", "G", "H"] }],
            })
            .mockResolvedValueOnce({
                currentQuestionIndex: 1,
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole("button", { name: "Next Question" }));
        });

        await waitFor(() => {
            expect(apiFetchAuth.fetchWithAuth).toHaveBeenCalledWith("/shared-quiz/ABC123/next?hostId=host123");
            expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
            expect(screen.getByText("E")).toBeInTheDocument();
        });
    });

    it("ends quiz when last question is reached", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "active",
                players: [{ id: "player1", username: "Player1", score: 100, isGuest: false }],
                currentQuestionIndex: 0,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            })
            .mockResolvedValueOnce({
                currentQuestionIndex: 1,
            })
            .mockResolvedValueOnce({
                status: "finished",
                players: [{ id: "player1", username: "Player1", score: 100, isGuest: false }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole("button", { name: "End Quiz" }));
        });

        await waitFor(() => {
            expect(apiFetchAuth.fetchWithAuth).toHaveBeenCalledWith("/shared-quiz/ABC123/end?hostId=host123");
            expect(screen.getByText("Quiz Completed")).toBeInTheDocument();
            expect(screen.getByText("Final Results")).toBeInTheDocument();
            expect(screen.getByText("#1 Player1")).toBeInTheDocument();
            expect(screen.getByText("100")).toBeInTheDocument();
        });
    });

    it("handles socket events (player-joined, player-left, answer-submitted)", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player1", username: "Player1", isGuest: false }],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [
                    { id: "player1", username: "Player1", isGuest: false },
                    { id: "player2", username: "Player2", isGuest: true },
                ],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                status: "waiting",
                players: [{ id: "player1", username: "Player1", isGuest: false }],
                currentQuestionIndex: -1,
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith("player-joined", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("player-left", expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith("answer-submitted", expect.any(Function));
        });

        // Simulate player-joined event
        const playerJoinedHandler = mockSocket.on.mock.calls.find((call) => call[0] === "player-joined")[1];
        act(() => {
            playerJoinedHandler({ playerId: "player2", username: "Player2" });
        });

        await waitFor(() => {
            expect(screen.getByText("Players (2)")).toBeInTheDocument();
            expect(screen.getByText("Player2")).toBeInTheDocument();
        });

        // Simulate player-left event
        const playerLeftHandler = mockSocket.on.mock.calls.find((call) => call[0] === "player-left")[1];
        act(() => {
            playerLeftHandler({ playerId: "player2" });
        });

        await waitFor(() => {
            expect(screen.getByText("Players (1)")).toBeInTheDocument();
        });

        // Simulate answer-submitted event
        const answerSubmittedHandler = mockSocket.on.mock.calls.find((call) => call[0] === "answer-submitted")[1];
        act(() => {
            answerSubmittedHandler({ playerId: "player1", score: 200 });
        });

        await waitFor(() => {
            expect(screen.getByText("Player1")).toBeInTheDocument();
        });
    });

    it("handles socket error event", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "waiting",
                players: [],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
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
        axios.get.mockRejectedValueOnce(new Error("Authentication error"));
        apiFetchAuth.fetchWithAuth.mockRejectedValueOnce(new Error("Failed to fetch session data"));

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Failed to fetch host data")).toBeInTheDocument();
        });
    });

    it("disconnects socket on component unmount", async () => {
        // Mock API calls
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "waiting",
                players: [],
                currentQuestionIndex: -1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            });

        // Set the query parameter for the quiz code
        mockRouter.setCurrentUrl("/wihoot/host/manager?code=ABC123");

        // Render the component
        const { unmount } = await act(async () => {
            return render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        // Wait for the component to fully render and setup to complete
        await waitFor(() => {
            expect(screen.getByText("Quiz Host - ABC123")).toBeInTheDocument();
        });

        // Unmount the component
        await act(async () => {
            unmount();
        });

        // Verify that the socket disconnect was called
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("navigates to create quiz page when Create New Quiz button is clicked in finished state", async () => {
        axios.get.mockResolvedValueOnce({ data: { _id: "host123", username: "HostUser" } });
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce({
                status: "finished",
                players: [{ id: "player1", username: "Player1", score: 100, isGuest: false }],
                currentQuestionIndex: 1,
            })
            .mockResolvedValueOnce({
                quizMetaData: { quizName: "Test Quiz" },
                quizData: [{ answers: ["A", "B", "C", "D"] }],
            });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <HostManager />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole("button", { name: "Create New Quiz" }));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe("/shared-quiz/create");
        });
    });
});